// src/components/Swap.tsx
import { useEffect, useMemo, useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import type { Address } from 'viem'
import { erc20Abi, encodeFunctionData, parseUnits, formatUnits, parseGwei } from 'viem'

import TokenSelector from './TokenSelector'
import { TOKENS } from '../tokens/intuit'
import RouterABI from '../abis/Router02.min.json' 

import styles from "../styles/swap.module.css";
import swap from '../images/swap.png'
import reverse from '../images/reverse.png'

import SwapGasFees from "../components/SwapGasFees"

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
const GAS_PRICE = parseGwei(import.meta.env.VITE_GAS_PRICE_GWEI ?? '0.2')
const GAS_LIMIT_SWAP = BigInt(import.meta.env.VITE_GAS_LIMIT_SWAP ?? '900000')
const MAX_UINT = (2n ** 256n) - 1n

export default function Swap() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // Sélection des tokens
  const [TIn, setTIn] = useState<UiToken>(() => TOKENS.find(t => t.symbol === 'tTRUST') as UiToken)
  const [TOut, setTOut] = useState<UiToken>(() => TOKENS.find(t => t.symbol === 'TKA') as UiToken)

  // Montants / params trade
  const [amountIn, setAmountIn] = useState('1')
  const [quoteOut, setQuoteOut] = useState<bigint | null>(null)
  const [slippage, setSlippage] = useState(0.5)
  const [deadlineMins, setDeadlineMins] = useState(10)
  const [pending, setPending] = useState(false)

  // Custom input slippage
  const [showCustom, setShowCustom] = useState(false)

  // State allowance (pour tokenIn si ERC20)
  const [allowIn, setAllowIn] = useState<bigint>(0n)
  const [balIn, setBalIn] = useState<bigint>(0n)
  const [balOut, setBalOut] = useState<bigint>(0n)

  // Helpers
  const path: Address[] = useMemo(() => [erc20Addr(TIn), erc20Addr(TOut)], [TIn, TOut])

  const rawIn = useMemo(() => {
    try { return parseUnits(amountIn || '0', TIn.decimals) } catch { return 0n }
  }, [amountIn, TIn.decimals])

  const minOut = useMemo(() => {
    if (!quoteOut) return 0n
    const bps = BigInt(Math.round(slippage * 100))
    return quoteOut - (quoteOut * bps / 10_000n)
  }, [quoteOut, slippage])

  const needApprove = useMemo(() => !TIn.isNative && rawIn > 0n && allowIn < rawIn, [TIn.isNative, rawIn, allowIn])

  // Lecture balance/allowance & quote
  const loadState = async () => {
    if (!publicClient || !address) return

    if (TIn.isNative) {
      const b = await publicClient.getBalance({ address })
      setBalIn(b)
    } else {
      const b = await publicClient.readContract({ address: erc20Addr(TIn), abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as bigint
      setBalIn(b)
      const a = await publicClient.readContract({ address: erc20Addr(TIn), abi: erc20Abi, functionName: 'allowance', args: [address, router] }) as bigint
      setAllowIn(a)
    }

    if (TOut.isNative) {
      const b = await publicClient.getBalance({ address })
      setBalOut(b)
    } else {
      const b = await publicClient.readContract({ address: erc20Addr(TOut), abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as bigint
      setBalOut(b)
    }

    if (rawIn === 0n) { setQuoteOut(null); return }
    try {
      const amounts = await publicClient.readContract({ address: router, abi: RouterABI as any, functionName: 'getAmountsOut', args: [rawIn, path] }) as bigint[]
      setQuoteOut(amounts?.[amounts.length - 1] ?? null)
    } catch (e) {
      console.warn('[swap] getAmountsOut failed', e)
      setQuoteOut(null)
    }
  }

  useEffect(() => { loadState() }, [publicClient, address, TIn, TOut, amountIn])

  // Send legacy tx
  const sendLegacy = async (to: Address, data: `0x${string}`, value: bigint = 0n) => {
    return await walletClient!.sendTransaction({ account: address!, to, data, value, gas: GAS_LIMIT_SWAP, gasPrice: GAS_PRICE })
  }

  const wait = (hash: `0x${string}`) => publicClient!.waitForTransactionReceipt({ hash })

  const onFlip = () => {
    setTIn(TOut)
    setTOut(TIn)
    setAmountIn('')
    setQuoteOut(null)
  }

  const onApprove = async () => {
    if (!walletClient || !address || TIn.isNative) return
    const data = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [router, MAX_UINT] })
    const h = await sendLegacy(erc20Addr(TIn), data, 0n)
    const rc = await wait(h)
    if (!(rc && rc.status === 'success')) throw new Error('Approve failed')
    await loadState()
  }

  const onSwap = async () => {
    if (!walletClient || !publicClient || !address || rawIn === 0n) return
    if (balIn < rawIn) { alert('Solde insuffisant'); return }
    if (needApprove) { alert('Veuillez approuver d’abord le token d’entrée'); return }
    if (!quoteOut || minOut === 0n) { alert('Pas de cotation disponible (liquidité insuffisante ?)'); return }

    setPending(true)
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMins * 60)

      if (TIn.isNative) {
        await publicClient.simulateContract({ account: address, address: router, abi: RouterABI as any, functionName: 'swapExactETHForTokens', args: [minOut, path, address, deadline], value: rawIn })
        const data = encodeFunctionData({ abi: RouterABI as any, functionName: 'swapExactETHForTokens', args: [minOut, path, address, deadline] })
        const h = await sendLegacy(router, data, rawIn)
        const rc = await wait(h)
        if (!(rc && rc.status === 'success')) throw new Error('swapExactETHForTokens reverted')
      } else if (TOut.isNative) {
        await publicClient.simulateContract({ account: address, address: router, abi: RouterABI as any, functionName: 'swapExactTokensForETH', args: [rawIn, minOut, path, address, deadline] })
        const data = encodeFunctionData({ abi: RouterABI as any, functionName: 'swapExactTokensForETH', args: [rawIn, minOut, path, address, deadline] })
        const h = await sendLegacy(router, data, 0n)
        const rc = await wait(h)
        if (!(rc && rc.status === 'success')) throw new Error('swapExactTokensForETH reverted')
      } else {
        await publicClient.simulateContract({ account: address, address: router, abi: RouterABI as any, functionName: 'swapExactTokensForTokens', args: [rawIn, minOut, path, address, deadline] })
        const data = encodeFunctionData({ abi: RouterABI as any, functionName: 'swapExactTokensForTokens', args: [rawIn, minOut, path, address, deadline] })
        const h = await sendLegacy(router, data, 0n)
        const rc = await wait(h)
        if (!(rc && rc.status === 'success')) throw new Error('swapExactTokensForTokens reverted')
      }

      alert('Swap réussi ✅')
      setAmountIn('')
      setQuoteOut(null)
      await loadState()
    } catch (e: any) {
      console.error('[swap] error', e)
      alert(e?.shortMessage || e?.message || 'Swap failed')
    } finally {
      setPending(false)
    }
  }

  const deadlineBN = useMemo(
    () => BigInt(Math.floor(Date.now() / 1000) + deadlineMins * 60),
    [deadlineMins]
  )

  // Choisir la bonne fonction + args + "value" si natif en entrée
  const swapCall = useMemo(() => {
    if (!address) return null
    if (TIn.isNative) {
      // tTRUST -> ERC20
      return {
        fn: "swapExactETHForTokens" as const,
        args: [minOut, path, address, deadlineBN] as const,
        value: rawIn,
        fallback: 150_000n,
      }
    }
    if (TOut.isNative) {
      // ERC20 -> tTRUST
      return {
        fn: "swapExactTokensForETH" as const,
        args: [rawIn, minOut, path, address, deadlineBN] as const,
        value: 0n,
        fallback: 150_000n,
      }
    }
    // ERC20 -> ERC20
    return {
      fn: "swapExactTokensForTokens" as const,
      args: [rawIn, minOut, path, address, deadlineBN] as const,
      value: 0n,
      fallback: 200_000n,
    }
  }, [address, TIn.isNative, TOut.isNative, rawIn, minOut, path, deadlineBN])

  const outPreview = quoteOut ? Number(formatUnits(quoteOut, TOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'

  return (
    <div className={styles.containerLcdAffiche}>
      <div className={styles.swapContainer}>

        {/* Input From */}
        <div className={styles.inputSellContainer}>
          <span className={styles.labelSwap}>
            <span className={styles.label}>From</span>
            <span className={styles.tokenBalance}>
              Balance {TIn.symbol}: <span className={styles.balanceNumber}>{Number(formatUnits(balIn, TIn.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
            </span>
          </span>
          <div className={styles.sellSelect}>
            <TokenSelector value={{ ...TIn, name: TIn.name ?? TIn.symbol }} onChange={t => setTIn(t)} />
            <input value={amountIn} onChange={e => setAmountIn(e.target.value)} placeholder="0.0" className={styles.InputSwap} />
          </div>
        </div>

        {/* Flip button */}
        <div>
          <button className={styles.onFlip} onClick={onFlip}>
            <img src={reverse} alt="Logo" className={styles.logoReverse} />
          </button>
        </div>

        {/* Input To */}
        <div className={styles.inputBuyContainer}>
          <span className={styles.labelSwap}>
            <span className={styles.label}>To</span>
            <span className={styles.tokenBalance}>
              Balance {TOut.symbol}: <span className={styles.balanceNumber}>{Number(formatUnits(balOut, TOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
            </span>
          </span>
          <div className={styles.sellSelect}>
            <TokenSelector value={{ ...TOut, name: TOut.name ?? TOut.symbol }} onChange={t => setTOut(t)} />
            <div className={styles.InputSwap}>{outPreview}</div>
          </div>
        </div>

        {/* Slippage & deadline */}
        <div className={styles.infosContainer}>
          <div className={styles.ligneInfoLabel}>
            <span className={styles.nameLigne}>Slippage:</span>
            <div className={styles.choicePercent}>
              {[0.1, 0.5, 1].map(p => (
                <button
                  key={p}
                  className={`${styles.choice} ${slippage === p ? styles.activeChoice : ''}`}
                  onClick={() => { setSlippage(p); setShowCustom(false) }}
                >
                  {p}%
                </button>
              ))}
              {!showCustom ? (
                <button className={styles.choice} onClick={() => setShowCustom(true)}>Custom</button>
              ) : (
                <div className={styles.inputPercentWrapper}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={slippage}
                  autoFocus
                  onChange={e => setSlippage(Number(e.target.value))}
                  onBlur={() => { if (!slippage) setSlippage(0.5) }}
                  className={styles.inputCustom}
                />
                <span className={styles.Sign}>%</span>
              </div>
              
              )}
            </div>
          </div>
          <div className={styles.ligneInfoLabel}>
          <span className={styles.nameLigne}>Deadline:</span>
          <div className={styles.inputPercentWrapper}>
          <input className={styles.inputCustom} type="number" min={1} value={deadlineMins} onChange={e => setDeadlineMins(Number(e.target.value))} /> 
          <span className={styles.percentSign}>min</span>
          </div>
        </div>
        {swapCall && (
          <SwapGasFees
            to={router}
            abi={RouterABI as any}
            functionName={swapCall.fn}
            args={swapCall.args as unknown as any[]}
            value={swapCall.value}
            enabled={Boolean(address && rawIn > 0n && path.length >= 2)}
            fallbackGas={swapCall.fallback}
          />
        )}
        </div>
        {/* Approve */}
        {!TIn.isNative && needApprove && (
          <button className={styles.btnSwap} onClick={onApprove} disabled={pending}>
            Approve {TIn.symbol}
          </button>
        )}
      </div>

      {/* Swap button */}
      <button className={styles.btnSwap} onClick={onSwap} disabled={!isConnected || pending || rawIn === 0n || (!TIn.isNative && needApprove)}>
        <span className={styles.motGrey}>{pending ? 'Swapping…' : 'Swap'}</span>
        <img src={swap} alt="Logo" className={styles.logoSwapBtn} />
      </button>

      <div className={styles.traitSwap}></div>
    </div>
  )
}
