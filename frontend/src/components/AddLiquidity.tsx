import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  usePublicClient,
  useWalletClient
} from 'wagmi'
import {
  Address,
  erc20Abi,
  encodeFunctionData,
  parseGwei,
  decodeFunctionData
} from 'viem'
import RouterABI from '../abis/Router02.min.json'

import TokenSelector from './TokenSelector'
import { TOKENS } from '../tokens/intuit'

import styles from "../styles/swap.module.css";

// --- Types locaux (compatibles avec ton TokenSelector) ---
type UiToken = {
  symbol: string
  name: string
  decimals: number
  isNative?: boolean
  address?: Address
  wrapped?: Address
}

// --- helpers token ---
const erc20Addr = (t: UiToken): Address => (t.isNative ? (t.wrapped as Address) : (t.address as Address))

// ENV
const router = import.meta.env.VITE_ROUTER_ADDRESS as Address
const factory = import.meta.env.VITE_FACTORY_ADDRESS as Address

const GAS_PRICE = parseGwei(import.meta.env.VITE_GAS_PRICE_GWEI ?? '0.2')
const GAS_LIMIT_ADD = BigInt(import.meta.env.VITE_GAS_LIMIT ?? '1200000')
const GAS_LIMIT_CREATE_PAIR = BigInt(import.meta.env.VITE_GAS_LIMIT_CREATE_PAIR ?? '3000000')
const MAX_UINT = (2n ** 256n) - 1n

// ABI minimal Factory
const FactoryABI = [
  { inputs: [{internalType:'address',name:'tokenA',type:'address'},{internalType:'address',name:'tokenB',type:'address'}], name:'getPair', outputs:[{internalType:'address',name:'pair',type:'address'}], stateMutability:'view', type:'function' },
  { inputs: [{internalType:'address',name:'tokenA',type:'address'},{internalType:'address',name:'tokenB',type:'address'}], name:'createPair', outputs:[{internalType:'address',name:'pair',type:'address'}], stateMutability:'nonpayable', type:'function' }
] as const

// ABI minimal Pair
const PairABI = [
  { inputs: [], name: 'getReserves', outputs: [
    { internalType:'uint112', name:'_reserve0', type:'uint112' },
    { internalType:'uint112', name:'_reserve1', type:'uint112' },
    { internalType:'uint32', name:'_blockTimestampLast', type:'uint32' },
  ], stateMutability:'view', type:'function' },
  { inputs: [], name: 'token0', outputs: [{internalType:'address',name:'',type:'address'}], stateMutability:'view', type:'function' },
  { inputs: [], name: 'token1', outputs: [{internalType:'address',name:'',type:'address'}], stateMutability:'view', type:'function' },
  { inputs: [], name: 'totalSupply', outputs: [{internalType:'uint256',name:'',type:'uint256'}], stateMutability:'view', type:'function' },
] as const

// utils
const toUnits = (v: string, decimals: number) => {
  const [w = '0', f = ''] = v.split('.')
  const whole = BigInt(w || '0')
  const frac = BigInt((f || '').padEnd(decimals, '0').slice(0, decimals) || '0')
  return whole * 10n ** BigInt(decimals) + frac
}
const fromUnits = (x: bigint, decimals: number) =>
  Number(x) / Number(10n ** BigInt(decimals))

export default function AddLiquidityPro() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // --- Sélection des tokens (par défaut: tTRUST + TKA) ---
  const [TA, setTA] = useState<UiToken>(() => TOKENS.find(t=>t.symbol==='tTRUST') as UiToken)
  const [TB, setTB] = useState<UiToken>(() => TOKENS.find(t=>t.symbol==='TKA') as UiToken)

  // form state
  const [amountA, setAmountA] = useState('1')
  const [amountB, setAmountB] = useState('1')
  const [lockedB, setLockedB] = useState(false) // si true, on modifie B à la main

  // slippage (à la Uniswap: presets + custom)
  const [slippage, setSlippage] = useState(0.5) // %
  const [deadlineMins, setDeadlineMins] = useState(10)

  const [pending, setPending] = useState(false)
  const [pair, setPair] = useState<Address | null>(null)
  const [reserves, setReserves] = useState<{rA: bigint, rB: bigint} | null>(null)
  const [allowA, setAllowA] = useState<bigint>(0n)
  const [allowB, setAllowB] = useState<bigint>(0n)
  const [balA, setBalA] = useState<bigint>(0n)
  const [balB, setBalB] = useState<bigint>(0n)

  // ---- helpers d’envoi “legacy” capé ----
  const sendLegacy = async (to: Address, data: `0x${string}`, gasLimit: bigint, value?: bigint) => {
    console.log('[sendLegacy] sending tx', { to, gasLimit: String(gasLimit), value: String(value ?? 0n), dataSnippet: (data || '').slice(0, 20) })
    const h = await walletClient!.sendTransaction({
      account: address!,
      to,
      data,
      value: value ?? 0n,
      gas: gasLimit,
      gasPrice: GAS_PRICE
    })
    console.log('[sendLegacy] txHash', h)
    return h
  }
  const wait = (hash: `0x${string}`) => {
    console.log('[wait] waiting receipt for', hash)
    return publicClient!.waitForTransactionReceipt({ hash })
  }

  // ---- charge pair + reserves + balances/allowances ---
  const loadState = async () => {
    if (!publicClient || !address || !TA || !TB) return
    console.log('[loadState] start', { address, TA: TA.symbol, TB: TB.symbol })

    const aErc20 = erc20Addr(TA)
    const bErc20 = erc20Addr(TB)

    const p = await publicClient.readContract({
      address: factory, abi: FactoryABI, functionName: 'getPair', args: [aErc20, bErc20]
    }) as Address
    console.log('[loadState] factory.getPair ->', p)
    setPair(p && p !== '0x0000000000000000000000000000000000000000' ? p : null)

    const [balA_, balB_, allowA_, allowB_] = await Promise.all([
      TA.isNative
        ? publicClient.getBalance({ address })
        : publicClient.readContract({ address: aErc20, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
      TB.isNative
        ? publicClient.getBalance({ address })
        : publicClient.readContract({ address: bErc20, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
      TA.isNative
        ? Promise.resolve(MAX_UINT) // pas d'approve pour natif
        : publicClient.readContract({ address: aErc20, abi: erc20Abi, functionName: 'allowance', args: [address, router] }) as Promise<bigint>,
      TB.isNative
        ? Promise.resolve(MAX_UINT)
        : publicClient.readContract({ address: bErc20, abi: erc20Abi, functionName: 'allowance', args: [address, router] }) as Promise<bigint>,
    ])
    console.log('[loadState] balances/allowances', { balA_: String(balA_), balB_: String(balB_), allowA_: String(allowA_), allowB_: String(allowB_) })
    setBalA(balA_); setBalB(balB_); setAllowA(allowA_); setAllowB(allowB_)

    if (p && p !== '0x0000000000000000000000000000000000000000') {
      const [t0, t1] = await Promise.all([
        publicClient.readContract({ address: p, abi: PairABI, functionName: 'token0' }) as Promise<Address>,
        publicClient.readContract({ address: p, abi: PairABI, functionName: 'token1' }) as Promise<Address>,
      ])
      const [r0, r1] = await publicClient.readContract({ address: p, abi: PairABI, functionName: 'getReserves' }) as unknown as [bigint, bigint, number]
      console.log('[loadState] pair tokens/reserves', { t0, t1, r0: String(r0), r1: String(r1) })
      // map reserves -> ordre (TA,TB) par rapport aux adresses ERC-20
      if (t0.toLowerCase() === aErc20.toLowerCase()) setReserves({ rA: r0, rB: r1 })
      else setReserves({ rA: r1, rB: r0 })
    } else {
      setReserves(null)
    }
    console.log('[loadState] done')
  }
  useEffect(() => { loadState() }, [address, publicClient, TA, TB])

  // ---- auto-calc du deuxième montant selon les réserves (comme l’UI Uniswap) ----
  useEffect(() => {
    if (!reserves || lockedB) return
    const a = toUnits(amountA, TA.decimals)
    if (reserves.rA === 0n || reserves.rB === 0n) return // pool vide -> on laisse au user
    const b = (a * reserves.rB) / reserves.rA
    setAmountB(String(fromUnits(b, TB.decimals)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },  [amountA, reserves?.rA, reserves?.rB, lockedB, TA.decimals, TB.decimals])

  // ---- états Approve / Supply ----
  const needApproveA = useMemo(
    () => !TA.isNative && toUnits(amountA || '0', TA.decimals) > 0n && allowA < toUnits(amountA, TA.decimals),
    [allowA, amountA, TA]
  )
  const needApproveB = useMemo(
    () => !TB.isNative && toUnits(amountB || '0', TB.decimals) > 0n && allowB < toUnits(amountB, TB.decimals),
    [allowB, amountB, TB]
  )
  const canSupply = isConnected && !needApproveA && !needApproveB && Number(amountA) > 0 && Number(amountB) > 0

  // ---- actions ----
  const onApprove = async (t: UiToken, label: string) => {
    if (!walletClient || !address || t.isNative) return
    const token = erc20Addr(t)
    console.log('[onApprove] token', token, label)
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [router, MAX_UINT]
    })
    const h = await sendLegacy(token, data, 120_000n)
    const receipt = await wait(h)
    console.log('[onApprove] receipt', { status: receipt.status, tx: h })
    if (!receipt || (receipt.status !== 'success')) {
      throw new Error(`Approval ${label} failed on-chain`)
    }
    await loadState()
  }

  const ensurePairExists = async () => {
    if (!walletClient || !publicClient) return
    if (pair) return
    const aErc20 = erc20Addr(TA)
    const bErc20 = erc20Addr(TB)
    console.log('[ensurePairExists] creating pair', { aErc20, bErc20 })
    const data = encodeFunctionData({
      abi: FactoryABI,
      functionName: 'createPair',
      args: [aErc20, bErc20]
    })
    const h = await sendLegacy(factory, data, GAS_LIMIT_CREATE_PAIR)
    const receipt = await wait(h)
    console.log('[ensurePairExists] createPair receipt', { status: receipt.status, tx: h })
    if (!receipt || (receipt.status !== 'success')) {
      throw new Error('createPair tx failed on-chain')
    }
    await loadState()
  }

  // helper pour diagnostiquer un revert
  const fetchRevertReason = async (txHash: `0x${string}`, providedData?: `0x${string}`) => {
    try {
      const tx = await publicClient!.getTransaction({ hash: txHash })
      console.log('[fetchRevertReason] tx', tx)
      const dataToDecode = (tx?.input as `0x${string}`) || providedData
      if (!dataToDecode) return
      try {
        const decoded = decodeFunctionData({ abi: RouterABI as any, data: dataToDecode })
        console.log('[fetchRevertReason] decoded input', decoded)
      } catch {}
      try {
        const callRes = await publicClient!.call({
          to: tx!.to as Address,
          data: dataToDecode,
          value: tx!.value ?? 0n,
          blockNumber: tx!.blockNumber ? (tx!.blockNumber - 1n) : undefined
        })
        console.log('[fetchRevertReason] eth_call result:', callRes)
      } catch (callErr:any) {
        console.error('[fetchRevertReason] eth_call reverted / threw', callErr?.message || callErr)
      }
    } catch (e:any) {
      console.error('[fetchRevertReason] error', e)
    }
  }

  const onSupply = async () => {
    if (!walletClient || !publicClient || !address) return
    setPending(true)
    try {
      console.log('[onSupply] start', { amountA, amountB, TA: TA.symbol, TB: TB.symbol, pair })

      await ensurePairExists()

      // refresh (au cas où)
      await loadState()

      const a = toUnits(amountA, TA.decimals)
      const b = toUnits(amountB, TB.decimals)
      if (a === 0n || b === 0n) throw new Error('Montants invalides')

      // sanity: balances & allowances
      if (balA < a) throw new Error(`Solde ${TA.symbol} insuffisant`)
      if (balB < b) throw new Error(`Solde ${TB.symbol} insuffisant`)
      if (!TA.isNative && allowA < a) throw new Error(`Allowance ${TA.symbol} insuffisante — approve d’abord`)
      if (!TB.isNative && allowB < b) throw new Error(`Allowance ${TB.symbol} insuffisante — approve d’abord`)

      // slippage
      const bps = BigInt(Math.round(slippage * 100)) // 0.5% -> 50 bps
      const amountAMin = a - (a * bps / 10_000n)
      const amountBMin = b - (b * bps / 10_000n)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMins * 60)

      const AisN = !!TA.isNative
      const BisN = !!TB.isNative
      if (AisN && BisN) throw new Error('Deux côtés natifs non supportés')

      if (AisN) {
        // tTRUST + ERC-20(B)
        const token = erc20Addr(TB)
        // simulate
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterABI as any,
          functionName: 'addLiquidityETH',
          args: [token, b, amountBMin, amountAMin, address, deadline],
          value: a
        })
        const data = encodeFunctionData({
          abi: RouterABI,
          functionName: 'addLiquidityETH',
          args: [token, b, amountBMin, amountAMin, address, deadline]
        })
        const h = await sendLegacy(router, data, GAS_LIMIT_ADD, a)
        const rc = await wait(h)
        const ok = rc && (rc.status === 'success')
        if (!ok) {
          try { await fetchRevertReason(h, data) } catch {}
          throw new Error('addLiquidityETH (A natif) reverted')
        }
      } else if (BisN) {
        // ERC-20(A) + tTRUST
        const token = erc20Addr(TA)
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterABI as any,
          functionName: 'addLiquidityETH',
          args: [token, a, amountAMin, amountBMin, address, deadline],
          value: b
        })
        const data = encodeFunctionData({
          abi: RouterABI,
          functionName: 'addLiquidityETH',
          args: [token, a, amountAMin, amountBMin, address, deadline]
        })
        const h = await sendLegacy(router, data, GAS_LIMIT_ADD, b)
        const rc = await wait(h)
        const ok = rc && (rc.status === 'success')
        if (!ok) {
          try { await fetchRevertReason(h, data) } catch {}
          throw new Error('addLiquidityETH (B natif) reverted')
        }
      } else {
        // ERC-20(A) + ERC-20(B)
        const tokenA = erc20Addr(TA)
        const tokenB = erc20Addr(TB)
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterABI as any,
          functionName: 'addLiquidity',
          args: [tokenA, tokenB, a, b, amountAMin, amountBMin, address, deadline]
        })
        const data = encodeFunctionData({
          abi: RouterABI,
          functionName: 'addLiquidity',
          args: [tokenA, tokenB, a, b, amountAMin, amountBMin, address, deadline]
        })
        const h = await sendLegacy(router, data, GAS_LIMIT_ADD)
        const rc = await wait(h)
        const ok = rc && (rc.status === 'success')
        if (!ok) {
          try { await fetchRevertReason(h, data) } catch {}
          throw new Error('addLiquidity reverted')
        }
      }

      alert('Liquidity supplied ✅')
      await loadState()
    } catch (e:any) {
      console.error('[onSupply] error', e)
      alert(e?.shortMessage || e?.message || 'Supply failed')
    } finally {
      setPending(false)
    }
  }

  // --- indicator ---
  const priceAB = reserves && reserves.rA>0n ? Number(reserves.rB)/Number(reserves.rA) : null
  const priceBA = reserves && reserves.rB>0n ? Number(reserves.rA)/Number(reserves.rB) : null

  return (
    <div className={styles.containerLcdAffiche}>
      <div className={styles.swapContainer}>

      <div>


      <div className={styles.inputSellContainer}>
          <span>Token A</span>
          <TokenSelector
            value={TA}
            onChange={(t) => {
              if (!t) return;
              setTA(t);
              setLockedB(false);
            }}
          />
          <input
            value={amountA}
            onChange={e => { setAmountA(e.target.value); setLockedB(false) }}
            className="border rounded px-2 py-1"
          />
        </div>


        <div className={styles.inputSellContainer}>
          <span>Token B</span>
          <TokenSelector
            value={TB}
            onChange={(t) => {
              if (!t) return;          
              setTB(t);
              setLockedB(true);
            }}
          />
          <input
            value={amountB}
            onChange={e => { setAmountB(e.target.value); setLockedB(true) }}
            className="border rounded px-2 py-1"
          />
        </div>

        {reserves ? (
          <div>
            <small>
              Pool price: 1 {TA.symbol} ≈ {priceAB?.toFixed(6) ?? '—'} {TB.symbol} | 1 {TB.symbol} ≈ {priceBA?.toFixed(6) ?? '—'} {TA.symbol}
            </small>
          </div>
        ) : (
          <small>La pair n’existe pas encore — la 1ʳᵉ supply la créera.</small>
        )}

        {/* Slippage / Deadline */}
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span>Slippage:</span>
          {[0.1,0.5,1].map(p => (
            <button key={p} onClick={()=>setSlippage(p)} style={{padding:'4px 8px', border: slippage===p?'2px solid #888':'1px solid #ccc', borderRadius:8}}>
              {p}%
            </button>
          ))}
          <input
            type="number" step="0.1" min="0"
            value={slippage}
            onChange={e=>setSlippage(Number(e.target.value))}
            style={{width:80, marginLeft:8}}
          />
          <span style={{marginLeft:12}}>Deadline:</span>
          <input type="number" min={1} value={deadlineMins} onChange={e=>setDeadlineMins(Number(e.target.value))} style={{width:80}}/> min
        </div>

        {/* Approvals (ERC-20) */}
        {!TA.isNative && needApproveA && (
          <button onClick={()=>onApprove(TA, TA.symbol)} disabled={pending}>
            Approve {TA.symbol}
          </button>
        )}
        {!TB.isNative && needApproveB && (
          <button onClick={()=>onApprove(TB, TB.symbol)} disabled={pending}>
            Approve {TB.symbol}
          </button>
        )}

     

        <small>
          Tips: aucun approve nécessaire pour {TA.isNative ? TA.symbol : TB.isNative ? TB.symbol : 'le natif'} ; si natif impliqué, le Router utilise `addLiquidityETH` et wrappe vers WTTRUST. 
        </small>
      </div>
    </div>
    <button className={styles.btnSwap} onClick={onSupply} disabled={!canSupply || pending}>
          {pending ? 'Supplying…' : 'Supply'}
        </button>
        <div className={styles.traitSwap}></div>
    </div>
  )
}
