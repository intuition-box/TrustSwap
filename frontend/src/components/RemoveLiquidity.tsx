// src/components/RemoveLiquidity.tsx
import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  usePublicClient,
  useWalletClient
} from 'wagmi'
import type { Address } from 'viem'
import {
  erc20Abi,
  encodeFunctionData,
  decodeFunctionData,
  parseGwei,
} from 'viem'

// --- UI / Token utils ---
import TokenSelector from './TokenSelector'
import { TOKENS } from '../tokens/intuit'
import { fmtAmount, fmtLP, fmtAllowance, fmtPct, shortAddr } from '../lib/format'

type UiToken = {
  symbol: string
  name: string
  decimals: number
  isNative?: boolean
  address?: Address
  wrapped?: Address
}
const erc20Addr = (t: UiToken): Address => (t.isNative ? (t.wrapped as Address) : (t.address as Address))

// ENV
const router = import.meta.env.VITE_ROUTER_ADDRESS as Address
const factory = import.meta.env.VITE_FACTORY_ADDRESS as Address

// Gas caps (comme ton AddLiquidity)
const GAS_PRICE = parseGwei(import.meta.env.VITE_GAS_PRICE_GWEI ?? '0.2')
const GAS_LIMIT_REMOVE = BigInt(import.meta.env.VITE_GAS_LIMIT_REMOVE ?? '1000000')
const MAX_UINT = (2n ** 256n) - 1n

// --- ABIs ---
// Router02 minimal (remove only)
const RouterRemoveABI = [
  // removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline)
  {
    inputs: [
      { internalType:'address', name:'tokenA', type:'address' },
      { internalType:'address', name:'tokenB', type:'address' },
      { internalType:'uint256', name:'liquidity', type:'uint256' },
      { internalType:'uint256', name:'amountAMin', type:'uint256' },
      { internalType:'uint256', name:'amountBMin', type:'uint256' },
      { internalType:'address', name:'to', type:'address' },
      { internalType:'uint256', name:'deadline', type:'uint256' }
    ],
    name:'removeLiquidity',
    outputs:[
      { internalType:'uint256', name:'amountA', type:'uint256' },
      { internalType:'uint256', name:'amountB', type:'uint256' }
    ],
    stateMutability:'nonpayable',
    type:'function'
  },
  // removeLiquidityETH(token, liquidity, amountTokenMin, amountETHMin, to, deadline)
  {
    inputs: [
      { internalType:'address', name:'token', type:'address' },
      { internalType:'uint256', name:'liquidity', type:'uint256' },
      { internalType:'uint256', name:'amountTokenMin', type:'uint256' },
      { internalType:'uint256', name:'amountETHMin', type:'uint256' },
      { internalType:'address', name:'to', type:'address' },
      { internalType:'uint256', name:'deadline', type:'uint256' }
    ],
    name:'removeLiquidityETH',
    outputs:[
      { internalType:'uint256', name:'amountToken', type:'uint256' },
      { internalType:'uint256', name:'amountETH', type:'uint256' }
    ],
    stateMutability:'nonpayable',
    type:'function'
  }
] as const

// Factory minimal
const FactoryABI = [
  { inputs:[{internalType:'address',name:'tokenA',type:'address'},{internalType:'address',name:'tokenB',type:'address'}], name:'getPair', outputs:[{internalType:'address',name:'pair',type:'address'}], stateMutability:'view', type:'function' }
] as const

// Pair minimal (spécifique V2)
const PairABI = [
  { inputs: [], name: 'token0', outputs: [{ type:'address' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'token1', outputs: [{ type:'address' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'getReserves', outputs: [
    { internalType:'uint112', name:'reserve0', type:'uint112' },
    { internalType:'uint112', name:'reserve1', type:'uint112' },
    { internalType:'uint32',  name:'blockTimestampLast', type:'uint32' },
  ], stateMutability:'view', type:'function' },
  { inputs: [], name:'totalSupply', outputs:[{ type:'uint256' }], stateMutability:'view', type:'function' },
] as const

// utils
const fromUnits = (x: bigint, decimals: number) => Number(x) / Number(10n ** BigInt(decimals))

export default function RemoveLiquidity() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // Sélection tokens (par défaut une pool courante : tTRUST / TKA)
  const [TA, setTA] = useState<UiToken>(() => TOKENS.find(t=>t.symbol==='tTRUST') as UiToken)
  const [TB, setTB] = useState<UiToken>(() => TOKENS.find(t=>t.symbol==='TKA') as UiToken)

  // State lecture on-chain
  const [pair, setPair] = useState<Address>()
  const [lpBal, setLpBal] = useState<bigint>(0n)        // balanceOf(user) du LP
  const [lpAllow, setLpAllow] = useState<bigint>(0n)    // allowance LP -> router
  const [totalSupply, setTotalSupply] = useState<bigint>(0n)
  const [t0, setT0] = useState<Address>()
  const [t1, setT1] = useState<Address>()
  const [r0, setR0] = useState<bigint>(0n) // reserves dans l’ordre token0/token1
  const [r1, setR1] = useState<bigint>(0n)

  // UI Remove
  const [percent, setPercent] = useState<number>(25)    // 25/50/75/100
  const [slippage, setSlippage] = useState<number>(0.5) // %
  const [deadlineMins, setDeadlineMins] = useState<number>(10)
  const [pending, setPending] = useState(false)

  // helpers d’envoi legacy
  const sendLegacy = async (to: Address, data: `0x${string}`, gasLimit: bigint) => {
    const h = await walletClient!.sendTransaction({
      account: address!,
      to, data,
      gas: gasLimit,
      gasPrice: GAS_PRICE,
      value: 0n
    })
    return h
  }
  const wait = (hash: `0x${string}`) => publicClient!.waitForTransactionReceipt({ hash })

  // Chargement des infos de la pool + LP du user
  const loadState = async () => {
    if (!publicClient || !address) return
    const aErc20 = erc20Addr(TA)
    const bErc20 = erc20Addr(TB)

    const p = await publicClient.readContract({
      address: factory, abi: FactoryABI, functionName: 'getPair', args: [aErc20, bErc20]
    }) as Address
    if (!p || p === '0x0000000000000000000000000000000000000000') {
      setPair(undefined); setLpBal(0n); setLpAllow(0n); setTotalSupply(0n); setR0(0n); setR1(0n); setT0(undefined); setT1(undefined)
      return
    }
    setPair(p)

    const [token0, token1] = await Promise.all([
      publicClient.readContract({ address: p, abi: PairABI, functionName: 'token0' }) as Promise<Address>,
      publicClient.readContract({ address: p, abi: PairABI, functionName: 'token1' }) as Promise<Address>,
    ])
    setT0(token0); setT1(token1)

    const [res0, res1] = await publicClient.readContract({ address: p, abi: PairABI, functionName: 'getReserves' }) as unknown as [bigint, bigint, number]
    setR0(res0); setR1(res1)

    const [ts, bal, allow] = await Promise.all([
      publicClient.readContract({ address: p, abi: PairABI, functionName: 'totalSupply' }) as Promise<bigint>,
      publicClient.readContract({ address: p, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
      publicClient.readContract({ address: p, abi: erc20Abi, functionName: 'allowance', args: [address, router] }) as Promise<bigint>,
    ])
    setTotalSupply(ts)
    setLpBal(bal)
    setLpAllow(allow)
  }

  useEffect(() => { loadState() }, [publicClient, address, TA, TB])

  // LP à retirer (en quantité brute) selon le pourcentage choisi
  const liqToRemove = useMemo(() => (lpBal * BigInt(percent)) / 100n, [lpBal, percent])

  // Amounts attendus si on brûle "liqToRemove" (proportion des réserves)
  const expected0 = useMemo(
    () => (totalSupply > 0n) ? (liqToRemove * r0) / totalSupply : 0n,
    [liqToRemove, r0, totalSupply]
  )
  const expected1 = useMemo(
    () => (totalSupply > 0n) ? (liqToRemove * r1) / totalSupply : 0n,
    [liqToRemove, r1, totalSupply]
  )

  // Map expected0/1 vers côté A/B de l’UI (selon token0 = aErc20 ?)
  const aErc20 = erc20Addr(TA)
  const bErc20 = erc20Addr(TB)
  const token0IsA = useMemo(() => !!t0 && t0.toLowerCase() === aErc20?.toLowerCase(), [t0, aErc20])
  const expA = token0IsA ? expected0 : expected1
  const expB = token0IsA ? expected1 : expected0

  // Minimums avec slippage
  const bps = BigInt(Math.round(slippage * 100)) // 0.5% => 50 bps
  const minA = expA - (expA * bps / 10_000n)
  const minB = expB - (expB * bps / 10_000n)

  const needApproveLP = useMemo(() => liqToRemove > 0n && lpAllow < liqToRemove, [lpAllow, liqToRemove])

  const onApproveLP = async () => {
    if (!walletClient || !address || !pair) return
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [router, MAX_UINT]
    })
    const h = await sendLegacy(pair, data, 120_000n)
    const rc = await wait(h)
    if (!(rc && (rc.status === 'success'))) {
      throw new Error('Approve LP failed')
    }
    await loadState()
  }

  const onRemove = async () => {
    if (!walletClient || !publicClient || !address) return
    if (!pair || liqToRemove === 0n) return
    if (lpBal < liqToRemove) { alert('LP insuffisants'); return }
    if (needApproveLP) { alert('Veuillez approuver d’abord vos LP'); return }

    setPending(true)
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMins * 60)

      const AisN = !!TA.isNative
      const BisN = !!TB.isNative
      if (AisN && BisN) throw new Error('Deux côtés natifs non supportés')

      if (AisN) {
        // tTRUST + ERC-20 (B) -> removeLiquidityETH(token=B)
        const token = bErc20
        // simulate
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterRemoveABI,
          functionName: 'removeLiquidityETH',
          args: [token, liqToRemove, minB, minA, address, deadline] // tokenMin=non-natif, ETHMin=natif
        })
        const data = encodeFunctionData({
          abi: RouterRemoveABI,
          functionName: 'removeLiquidityETH',
          args: [token, liqToRemove, minB, minA, address, deadline]
        })
        const h = await sendLegacy(router, data, GAS_LIMIT_REMOVE)
        const rc = await wait(h)
        if (!(rc && (rc.status === 'success'))) {
          try { decodeFunctionData({ abi: RouterRemoveABI as any, data }) } catch {}
          throw new Error('removeLiquidityETH reverted (A natif)')
        }
      } else if (BisN) {
        // ERC-20 (A) + tTRUST -> removeLiquidityETH(token=A)
        const token = aErc20
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterRemoveABI,
          functionName: 'removeLiquidityETH',
          args: [token, liqToRemove, minA, minB, address, deadline]
        })
        const data = encodeFunctionData({
          abi: RouterRemoveABI,
          functionName: 'removeLiquidityETH',
          args: [token, liqToRemove, minA, minB, address, deadline]
        })
        const h = await sendLegacy(router, data, GAS_LIMIT_REMOVE)
        const rc = await wait(h)
        if (!(rc && (rc.status === 'success'))) {
          throw new Error('removeLiquidityETH reverted (B natif)')
        }
      } else {
        // ERC-20 + ERC-20
        await publicClient.simulateContract({
          account: address,
          address: router,
          abi: RouterRemoveABI,
          functionName: 'removeLiquidity',
          args: [aErc20, bErc20, liqToRemove, minA, minB, address, deadline]
        })
        const data = encodeFunctionData({
          abi: RouterRemoveABI,
          functionName: 'removeLiquidity',
          args: [aErc20, bErc20, liqToRemove, minA, minB, address, deadline]
        })
        const h = await sendLegacy(router, data, GAS_LIMIT_REMOVE)
        const rc = await wait(h)
        if (!(rc && (rc.status === 'success'))) {
          throw new Error('removeLiquidity reverted')
        }
      }

      alert('Liquidité retirée ✅')
      await loadState()
    } catch (e:any) {
      console.error('[onRemove] error', e)
      alert(e?.shortMessage || e?.message || 'Remove failed')
    } finally {
      setPending(false)
    }
  }

  const disabled = !isConnected || !pair || lpBal === 0n

  return (
    <div style={{maxWidth: 720}}>
      <h2>Remove Liquidity</h2>

      {/* Sélection de la pool (A/B) */}
      <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:8}}>
        <span>Pool</span>
        <TokenSelector value={TA} onChange={(t: UiToken)=>setTA(t)} />
        <span>/</span>
        <TokenSelector value={TB} onChange={(t: UiToken)=>setTB(t)} />
      </div>

      {/* Infos LP & réserves */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8}}>
        <div className="card">
            <div>LP balance: <strong>{fmtLP(lpBal)}</strong></div>
            <div>LP allowance: {fmtAllowance(lpAllow)}</div>
            <div>Total supply: {fmtLP(totalSupply, { compact: true })}</div>
            <div>Your share of the pool: <strong>{fmtPct(lpBal, totalSupply, 4)}</strong></div>
        </div>

        <div className="card">

        <div style={{marginTop:10}}>Expected:</div>
        <div>• {TA.symbol}: <strong>{fmtAmount(expA, TA.decimals)}</strong></div>
        <div>• {TB.symbol}: <strong>{fmtAmount(expB, TB.decimals)}</strong></div>

        <div style={{marginTop:10}}>Minimum ({slippage}%):</div>
        <div>• {TA.symbol}: {fmtAmount(minA, TA.decimals)}</div>
        <div>• {TB.symbol}: {fmtAmount(minB, TB.decimals)}</div>
        </div>
      </div>

      {/* Pourcentage à retirer */}
      <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
        <span>Amount:</span>
        {[25,50,75,100].map(p => (
          <button key={p} onClick={()=>setPercent(p)} style={{padding:'4px 8px', border: percent===p?'2px solid #888':'1px solid #ccc', borderRadius:8}}>
            {p}%
          </button>
        ))}
        <span style={{marginLeft:12}}>Slippage:</span>
        {[0.1,0.5,1].map(s=>(
          <button key={s} onClick={()=>setSlippage(s)} style={{padding:'4px 8px', border: slippage===s?'2px solid #888':'1px solid #ccc', borderRadius:8}}>
            {s}%
          </button>
        ))}
        <span style={{marginLeft:12}}>Deadline:</span>
        <input type="number" min={1} value={deadlineMins} onChange={e=>setDeadlineMins(Number(e.target.value))} style={{width:80}}/> min
      </div>

      {/* Approve LP si nécessaire */}
      {needApproveLP && (
        <button onClick={onApproveLP} disabled={pending || !pair}>
          Approve LP
        </button>
      )}

      <button onClick={onRemove} disabled={pending || disabled || needApproveLP}>
        {pending ? 'Removing…' : 'Remove'}
      </button>

      {!pair && <div style={{marginTop:8}}><small>La pair n’existe pas ou vous n’avez pas de LP.</small></div>}
    </div>
  )
}
