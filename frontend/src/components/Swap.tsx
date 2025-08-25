// src/components/Swap.tsx
import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  usePublicClient,
  useWalletClient,
} from 'wagmi'
import type { Address } from 'viem'
import {
  erc20Abi,
  encodeFunctionData,
  parseUnits,
  formatUnits,
  parseGwei,
} from 'viem'

import TokenSelector from './TokenSelect'
import { TOKENS } from '../tokens/intuit'
import RouterABI from '../abis/Router02.min.json' 

import styles from "../styles/swap.module.css";

type UiToken = {
  symbol: string
  name?: string
  decimals: number
  isNative?: boolean
  address?: Address
  wrapped?: Address
}
const erc20Addr = (t: UiToken): Address => (t.isNative ? (t.wrapped as Address) : (t.address as Address))

// ENV
const router = import.meta.env.VITE_ROUTER_ADDRESS as Address
// gas caps (comme dans tes autres composants)
const GAS_PRICE = parseGwei(import.meta.env.VITE_GAS_PRICE_GWEI ?? '0.2')
const GAS_LIMIT_SWAP = BigInt(import.meta.env.VITE_GAS_LIMIT_SWAP ?? '900000')
const MAX_UINT = (2n ** 256n) - 1n

export default function Swap() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // Sélection des tokens
  const [TIn,  setTIn]  = useState<UiToken>(() => TOKENS.find(t => t.symbol === 'tTRUST') as UiToken)
  const [TOut, setTOut] = useState<UiToken>(() => TOKENS.find(t => t.symbol === 'TKA') as UiToken)

  // Montants / params trade
  const [amountIn, setAmountIn] = useState('1') // string user
  const [quoteOut, setQuoteOut] = useState<bigint | null>(null)
  const [slippage, setSlippage] = useState(0.5) // %
  const [deadlineMins, setDeadlineMins] = useState(10)
  const [pending, setPending] = useState(false)

  // State allowance (pour tokenIn si ERC20)
  const [allowIn, setAllowIn] = useState<bigint>(0n)
  const [balIn, setBalIn] = useState<bigint>(0n)

  // helpers
  const path: Address[] = useMemo(() => {
    const aIn  = erc20Addr(TIn)
    const aOut = erc20Addr(TOut)
    return [aIn, aOut]
  }, [TIn, TOut])

  const rawIn = useMemo(() => {
    try { return parseUnits(amountIn || '0', TIn.decimals) } catch { return 0n }
  }, [amountIn, TIn.decimals])

  const minOut = useMemo(() => {
    if (!quoteOut) return 0n
    const bps = BigInt(Math.round(slippage * 100)) // 0.5% -> 50 bps
    return quoteOut - (quoteOut * bps / 10_000n)
  }, [quoteOut, slippage])

  const needApprove = useMemo(() => !TIn.isNative && rawIn > 0n && allowIn < rawIn, [TIn.isNative, rawIn, allowIn])

  // lecture balance/allowance & quote
  const loadState = async () => {
    if (!publicClient || !address) return
    // balance tokenIn
    if (TIn.isNative) {
      const b = await publicClient.getBalance({ address })
      setBalIn(b)
    } else {
      const b = await publicClient.readContract({
        address: erc20Addr(TIn), abi: erc20Abi, functionName: 'balanceOf', args: [address]
      }) as bigint
      setBalIn(b)
      const a = await publicClient.readContract({
        address: erc20Addr(TIn), abi: erc20Abi, functionName: 'allowance', args: [address, router]
      }) as bigint
      setAllowIn(a)
    }

    // quote
    if (rawIn === 0n) { setQuoteOut(null); return }
    try {
      const amounts = await publicClient.readContract({
        address: router,
        abi: RouterABI as any,
        functionName: 'getAmountsOut',
        args: [rawIn, path],
      }) as bigint[]
      setQuoteOut(amounts?.[amounts.length - 1] ?? null)
    } catch (e) {
      // si la pair n’existe pas ou pas de liquidité, getAmountsOut peut revert
      console.warn('[swap] getAmountsOut failed', e)
      setQuoteOut(null)
    }
  }

  useEffect(() => { loadState() }, [publicClient, address, TIn, TOut, amountIn])

  // send legacy tx
  const sendLegacy = async (to: Address, data: `0x${string}`, value: bigint = 0n) => {
    const h = await walletClient!.sendTransaction({
      account: address!,
      to, data, value,
      gas: GAS_LIMIT_SWAP,
      gasPrice: GAS_PRICE,
    })
    return h
  }
  const wait = (hash: `0x${string}`) => publicClient!.waitForTransactionReceipt({ hash })

  const onFlip = () => {
    setTIn(TOut)
    setTOut(TIn)
    setAmountIn('')  // reset pour forcer un nouveau quote propre
    setQuoteOut(null)
  }

  const onApprove = async () => {
    if (!walletClient || !address || TIn.isNative) return
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [router, MAX_UINT] // approve infini (UX façon Uniswap)
    })
    const h = await sendLegacy(erc20Addr(TIn), data, 0n)
    const rc = await wait(h)
    if (!(rc && (rc.status === 'success'))) throw new Error('Approve failed')
    await loadState()
  }

  const onSwap = async () => {
    if (!walletClient || !publicClient || !address) return
    if (rawIn === 0n) return
    if (balIn < rawIn) { alert('Solde insuffisant'); return }
    if (needApprove) { alert('Veuillez approuver d’abord le token d’entrée'); return }
    if (!quoteOut || minOut === 0n) { alert('Pas de cotation disponible (liquidité insuffisante ?)'); return }

    setPending(true)
    try {
      const deadline = BigInt(Math.floor(Date.now()/1000) + deadlineMins*60)

      if (TIn.isNative) {
        // tTRUST -> Token : swapExactETHForTokens
        // simulate (utile pour message d’erreur net)
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterABI as any,
          functionName: 'swapExactETHForTokens',
          args: [minOut, path, address, deadline],
          value: rawIn,
        })
        const data = encodeFunctionData({
          abi: RouterABI as any,
          functionName: 'swapExactETHForTokens',
          args: [minOut, path, address, deadline]
        })
        const h = await sendLegacy(router, data, rawIn)
        const rc = await wait(h)
        if (!(rc && (rc.status === 'success'))) throw new Error('swapExactETHForTokens reverted')
      } else if (TOut.isNative) {
        // Token -> tTRUST : swapExactTokensForETH
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterABI as any,
          functionName: 'swapExactTokensForETH',
          args: [rawIn, minOut, path, address, deadline],
        })
        const data = encodeFunctionData({
          abi: RouterABI as any,
          functionName: 'swapExactTokensForETH',
          args: [rawIn, minOut, path, address, deadline]
        })
        const h = await sendLegacy(router, data, 0n)
        const rc = await wait(h)
        if (!(rc && (rc.status === 'success'))) throw new Error('swapExactTokensForETH reverted')
      } else {
        // Token -> Token : swapExactTokensForTokens
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterABI as any,
          functionName: 'swapExactTokensForTokens',
          args: [rawIn, minOut, path, address, deadline],
        })
        const data = encodeFunctionData({
          abi: RouterABI as any,
          functionName: 'swapExactTokensForTokens',
          args: [rawIn, minOut, path, address, deadline]
        })
        const h = await sendLegacy(router, data, 0n)
        const rc = await wait(h)
        if (!(rc && (rc.status === 'success'))) throw new Error('swapExactTokensForTokens reverted')
      }

      alert('Swap réussi ✅')
      setAmountIn('')
      setQuoteOut(null)
      await loadState()
    } catch (e:any) {
      console.error('[swap] error', e)
      alert(e?.shortMessage || e?.message || 'Swap failed')
    } finally {
      setPending(false)
    }
  }

  const outPreview = quoteOut ? Number(formatUnits(quoteOut, TOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'

  return (
    <div className={styles.containerLcdAffiche}>
      <span className={styles.title}>Swap</span>

        <div className={styles.inputSellContainer}>
          <span className={styles.labelSwap}>Sell</span>
          <TokenSelector value={{ ...TIn, name: TIn.name ?? TIn.symbol }} onChange={(t: UiToken)=>setTIn(t)} />
          <input
            value={amountIn}
            onChange={e => setAmountIn(e.target.value)}
            placeholder="0.0"
          />
        </div>

        <div>
          <button onClick={onFlip}>⇅</button>
        </div>

        <div>
          <span>Buy</span>
          <TokenSelector value={{ ...TOut, name: TOut.name ?? TOut.symbol }} onChange={(t: UiToken)=>setTOut(t)} />
          <div>
            ≈ {outPreview} {TOut.symbol}
          </div>
        </div>


        <div>
          <span>Slippage:</span>
          {[0.1,0.5,1].map(p => (
            <button key={p} onClick={()=>setSlippage(p)} style={{padding:'2px 8px', border: slippage===p?'2px solid #888':'1px solid #ccc', borderRadius:8}}>
              {p}%
            </button>
          ))}
          <input
            type="number" step="0.1" min="0"
            value={slippage}
            onChange={e=>setSlippage(Number(e.target.value))}
          />
          <span>Deadline:</span>
          <input type="number" min={1} value={deadlineMins} onChange={e=>setDeadlineMins(Number(e.target.value))} style={{width:80}}/> min
        </div>

        {/* Approve si nécessaire (quand le token d’entrée est ERC-20) */}
        {!TIn.isNative && needApprove && (
          <button onClick={onApprove} disabled={pending}>
            Approve {TIn.symbol}
          </button>
        )}

        <button onClick={onSwap} disabled={!isConnected || pending || rawIn===0n || (!TIn.isNative && needApprove)}>
          {pending ? 'Swapping…' : 'Swap'}
        </button>

        {/* Infos rapides */}
        <small>
          Balance {TIn.symbol}: {Number(formatUnits(balIn, TIn.decimals)).toLocaleString(undefined,{maximumFractionDigits:6})}
        </small>
      </div>

  )
}
