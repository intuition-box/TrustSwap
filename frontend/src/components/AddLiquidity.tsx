import { useEffect, useMemo, useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import type { Address } from 'viem'
import { erc20Abi, encodeFunctionData, parseGwei, decodeFunctionData } from 'viem'
import RouterABI from '../abis/Router02.min.json'

import TokenSelector from './TokenSelector'
import { TOKENS } from '../tokens/intuit'
import styles from "../styles/liquidity.module.css"

type UiToken = {
  symbol: string
  name: string
  decimals: number
  isNative?: boolean
  address?: Address
  wrapped?: Address
}

// Helpers sûrs
const addrOf = (t?: UiToken | null): Address | undefined =>
  t ? (t.isNative ? (t.wrapped as Address) : (t.address as Address)) : undefined
const decOf = (t?: UiToken | null): number => t?.decimals ?? 18

// ENV
const router = import.meta.env.VITE_ROUTER_ADDRESS as Address
const factory = import.meta.env.VITE_FACTORY_ADDRESS as Address
const GAS_PRICE = parseGwei(import.meta.env.VITE_GAS_PRICE_GWEI ?? '0.2')
const GAS_LIMIT_ADD = BigInt(import.meta.env.VITE_GAS_LIMIT ?? '1200000')
const GAS_LIMIT_CREATE_PAIR = BigInt(import.meta.env.VITE_GAS_LIMIT_CREATE_PAIR ?? '3000000')
const MAX_UINT = (2n ** 256n) - 1n

const FactoryABI = [
  { inputs:[{type:'address',name:'tokenA'},{type:'address',name:'tokenB'}], name:'getPair', outputs:[{type:'address',name:'pair'}], stateMutability:'view', type:'function' },
  { inputs:[{type:'address',name:'tokenA'},{type:'address',name:'tokenB'}], name:'createPair', outputs:[{type:'address',name:'pair'}], stateMutability:'nonpayable', type:'function' }
] as const

const PairABI = [
  { inputs: [], name:'getReserves', outputs:[{type:'uint112'},{type:'uint112'},{type:'uint32'}], stateMutability:'view', type:'function' },
  { inputs: [], name:'token0', outputs:[{type:'address'}], stateMutability:'view', type:'function' },
  { inputs: [], name:'token1', outputs:[{type:'address'}], stateMutability:'view', type:'function' },
  { inputs: [], name:'totalSupply', outputs:[{type:'uint256'}], stateMutability:'view', type:'function' },
] as const

const toUnits = (v: string, decimals: number) => {
  const [w='0', f=''] = (v || '0').split('.')
  const whole = BigInt(w || '0')
  const frac  = BigInt((f || '').padEnd(decimals, '0').slice(0, decimals) || '0')
  return whole * 10n ** BigInt(decimals) + frac
}
const fromUnits = (x: bigint, decimals: number) =>
  Number(x) / Number(10n ** BigInt(decimals))

export default function AddLiquidityPro() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // Défauts robustes : natif + TSWP (ou 1er ERC-20)
  const ALL = TOKENS.filter(Boolean)
  const DEFAULT_A = ALL.find(t => t.isNative) || ALL[0]
  const DEFAULT_B = ALL.find(t => t.symbol === 'TSWP') || ALL.find(t => !t.isNative) || ALL[1] || ALL[0]

  const [TA, setTA] = useState<UiToken | null>(DEFAULT_A ?? null)
  const [TB, setTB] = useState<UiToken | null>(DEFAULT_B ?? null)

  // form state
  const [amountA, setAmountA] = useState('1')
  const [amountB, setAmountB] = useState('1')
  const [lockedB, setLockedB] = useState(false)
  const [slippage, setSlippage] = useState(0.5)
  const [deadlineMins, setDeadlineMins] = useState(10)

  const [pending, setPending] = useState(false)
  const [pair, setPair] = useState<Address | null>(null)
  const [reserves, setReserves] = useState<{rA: bigint, rB: bigint} | null>(null)
  const [allowA, setAllowA] = useState<bigint>(0n)
  const [allowB, setAllowB] = useState<bigint>(0n)
  const [balA, setBalA] = useState<bigint>(0n)
  const [balB, setBalB] = useState<bigint>(0n)

  const Aaddr = useMemo(() => addrOf(TA), [TA])
  const Baddr = useMemo(() => addrOf(TB), [TB])
  const Adec  = useMemo(() => decOf(TA), [TA])
  const Bdec  = useMemo(() => decOf(TB), [TB])

  // Envoi legacy (EIP-1559 désactivé volontairement)
  const sendLegacy = async (to: Address, data: `0x${string}`, gasLimit: bigint, value?: bigint) => {
    const h = await walletClient!.sendTransaction({
      account: address!, to, data, value: value ?? 0n, gas: gasLimit, gasPrice: GAS_PRICE,
    })
    return h
  }
  const wait = (hash: `0x${string}`) => publicClient!.waitForTransactionReceipt({ hash })

  // Charger pair/reserves/balances/allowances si prêt
  const loadState = async () => {
    if (!publicClient || !address || !TA || !TB || !Aaddr || !Baddr) return

    const p = await publicClient.readContract({
      address: factory, abi: FactoryABI, functionName: 'getPair', args: [Aaddr, Baddr]
    }) as Address
    setPair(p && p !== '0x0000000000000000000000000000000000000000' ? p : null)

    const [balA_, balB_, allowA_, allowB_] = await Promise.all([
      TA.isNative ? publicClient.getBalance({ address })
        : publicClient.readContract({ address: Aaddr, abi: erc20Abi, functionName:'balanceOf', args:[address] }) as Promise<bigint>,
      TB.isNative ? publicClient.getBalance({ address })
        : publicClient.readContract({ address: Baddr, abi: erc20Abi, functionName:'balanceOf', args:[address] }) as Promise<bigint>,
      TA.isNative ? Promise.resolve(MAX_UINT)
        : publicClient.readContract({ address: Aaddr, abi: erc20Abi, functionName:'allowance', args:[address, router] }) as Promise<bigint>,
      TB.isNative ? Promise.resolve(MAX_UINT)
        : publicClient.readContract({ address: Baddr, abi: erc20Abi, functionName:'allowance', args:[address, router] }) as Promise<bigint>,
    ])
    setBalA(balA_); setBalB(balB_); setAllowA(allowA_); setAllowB(allowB_)

    if (p && p !== '0x0000000000000000000000000000000000000000') {
      const [t0, t1] = await Promise.all([
        publicClient.readContract({ address: p, abi: PairABI, functionName:'token0' }) as Promise<Address>,
        publicClient.readContract({ address: p, abi: PairABI, functionName:'token1' }) as Promise<Address>,
      ])
      const [r0, r1] = await publicClient.readContract({ address: p, abi: PairABI, functionName:'getReserves' }) as unknown as [bigint,bigint,number]
      setReserves(t0.toLowerCase() === Aaddr.toLowerCase() ? { rA: r0, rB: r1 } : { rA: r1, rB: r0 })
    } else {
      setReserves(null)
    }
  }
  useEffect(() => { loadState() }, [address, publicClient, TA, TB, Aaddr, Baddr])

  // Auto-calc B si la pool existe & B non verrouillé
  useEffect(() => {
    if (!reserves || !TA || !TB || lockedB) return
    const a = toUnits(amountA || '0', Adec)
    if (a === 0n) return
    if (reserves.rA === 0n || reserves.rB === 0n) return // pool vide
    const b = (a * reserves.rB) / reserves.rA
    setAmountB(String(fromUnits(b, Bdec)))
  }, [amountA, Adec, Bdec, reserves?.rA, reserves?.rB, lockedB, TA, TB])

  const needApproveA = useMemo(() => {
    if (!TA || TA.isNative) return false
    const needed = toUnits(amountA || '0', Adec)
    return needed > 0n && allowA < needed
  }, [TA, amountA, allowA, Adec])

  const needApproveB = useMemo(() => {
    if (!TB || TB.isNative) return false
    const needed = toUnits(amountB || '0', Bdec)
    return needed > 0n && allowB < needed
  }, [TB, amountB, allowB, Bdec])

  const ready = Boolean(TA && TB && (!TA.isNative ? Aaddr : true) && (!TB.isNative ? Baddr : true))
  const canSupply = isConnected && ready && !needApproveA && !needApproveB && Number(amountA) > 0 && Number(amountB) > 0

  const onApprove = async (t: UiToken | null, label: string) => {
    if (!walletClient || !address || !t || t.isNative) return
    const token = addrOf(t)! // safe car non-native vérifié
    const data = encodeFunctionData({ abi: erc20Abi, functionName:'approve', args:[router, MAX_UINT] })
    const h = await sendLegacy(token, data, 120_000n)
    const rc = await wait(h)
    if (!(rc && rc.status === 'success')) throw new Error(`Approval ${label} failed`)
    await loadState()
  }

  const ensurePairExists = async () => {
    if (!walletClient || !publicClient || !Aaddr || !Baddr) return
    if (pair) return
    const data = encodeFunctionData({ abi: FactoryABI, functionName:'createPair', args:[Aaddr, Baddr] })
    const h = await sendLegacy(factory, data, GAS_LIMIT_CREATE_PAIR)
    const rc = await wait(h)
    if (!(rc && rc.status === 'success')) throw new Error('createPair tx failed')
    await loadState()
  }

  const fetchRevertReason = async (txHash: `0x${string}`, providedData?: `0x${string}`) => {
    try {
      const tx = await publicClient!.getTransaction({ hash: txHash })
      const dataToDecode = (tx?.input as `0x${string}`) || providedData
      if (!dataToDecode) return
      try { console.log('[decoded]', decodeFunctionData({ abi: RouterABI as any, data: dataToDecode })) } catch {}
      try {
        const callRes = await publicClient!.call({ to: tx!.to as Address, data: dataToDecode, value: tx!.value ?? 0n, blockNumber: tx!.blockNumber ? (tx!.blockNumber - 1n) : undefined })
        console.log('[eth_call result]', callRes)
      } catch (e:any) { console.error('[eth_call reverted]', e?.message || e) }
    } catch (e:any) { console.error('[fetchRevertReason]', e) }
  }

  const onSupply = async () => {
    if (!walletClient || !publicClient || !address || !TA || !TB) return
    if (!ready) return
    setPending(true)
    try {
      await ensurePairExists()
      await loadState()

      const a = toUnits(amountA, Adec)
      const b = toUnits(amountB, Bdec)
      if (a === 0n || b === 0n) throw new Error('Invalid amounts')

      if (balA < a) throw new Error(`Insufficient ${TA.symbol} balance`)
      if (balB < b) throw new Error(`Insufficient ${TB.symbol} balance`)
      if (!TA.isNative && allowA < a) throw new Error(`Approve ${TA.symbol} first`)
      if (!TB.isNative && allowB < b) throw new Error(`Approve ${TB.symbol} first`)

      const bps = BigInt(Math.round(slippage * 100))
      const amountAMin = a - (a * bps / 10_000n)
      const amountBMin = b - (b * bps / 10_000n)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMins * 60)

      const AisN = !!TA.isNative
      const BisN = !!TB.isNative
      if (AisN && BisN) throw new Error('Both sides native not supported')

      if (AisN) {
        const token = Baddr!
        await publicClient.simulateContract({ account: address, address: router, abi: RouterABI as any, functionName:'addLiquidityETH', args:[token, b, amountBMin, amountAMin, address, deadline], value: a })
        const data = encodeFunctionData({ abi: RouterABI, functionName:'addLiquidityETH', args:[token, b, amountBMin, amountAMin, address, deadline] })
        const h = await sendLegacy(router, data, GAS_LIMIT_ADD, a)
        const rc = await wait(h)
        if (!(rc && rc.status === 'success')) { try { await fetchRevertReason(h, data) } catch {}; throw new Error('addLiquidityETH (A native) reverted') }
      } else if (BisN) {
        const token = Aaddr!
        await publicClient.simulateContract({ account: address, address: router, abi: RouterABI as any, functionName:'addLiquidityETH', args:[token, a, amountAMin, amountBMin, address, deadline], value: b })
        const data = encodeFunctionData({ abi: RouterABI, functionName:'addLiquidityETH', args:[token, a, amountAMin, amountBMin, address, deadline] })
        const h = await sendLegacy(router, data, GAS_LIMIT_ADD, b)
        const rc = await wait(h)
        if (!(rc && rc.status === 'success')) { try { await fetchRevertReason(h, data) } catch {}; throw new Error('addLiquidityETH (B native) reverted') }
      } else {
        const tokenA = Aaddr!, tokenB = Baddr!
        await publicClient.simulateContract({ account: address, address: router, abi: RouterABI as any, functionName:'addLiquidity', args:[tokenA, tokenB, a, b, amountAMin, amountBMin, address, deadline] })
        const data = encodeFunctionData({ abi: RouterABI, functionName:'addLiquidity', args:[tokenA, tokenB, a, b, amountAMin, amountBMin, address, deadline] })
        const h = await sendLegacy(router, data, GAS_LIMIT_ADD)
        const rc = await wait(h)
        if (!(rc && rc.status === 'success')) { try { await fetchRevertReason(h, data) } catch {}; throw new Error('addLiquidity reverted') }
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

  const priceAB = reserves && reserves.rA>0n ? Number(reserves.rB)/Number(reserves.rA) : null
  const priceBA = reserves && reserves.rB>0n ? Number(reserves.rA)/Number(reserves.rB) : null

  return (
    <div className={styles.pool}>
      <div className={`${styles.swapContainer} ${styles.inlineRow}`}>

        <div className={styles.inlineCol}>
          <TokenSelector value={TA ?? undefined} onChange={(t) => { setTA(t); setLockedB(false) }} />
          <input
            value={amountA}
            onChange={e => { setAmountA(e.target.value); setLockedB(false) }}
            className="border rounded px-2 py-1"
          />
        </div>

        <div className={styles.inlineCol}>
          <TokenSelector value={TB ?? undefined} onChange={(t) => { setTB(t); setLockedB(true) }} />
          <input
            value={amountB}
            onChange={e => { setAmountB(e.target.value); setLockedB(true) }}
            className="border rounded px-2 py-1"
          />
        </div>

        {reserves ? (
          <div className={styles.inlineInfo}>
            <small>
              Pool price: 1 {TA?.symbol} ≈ {priceAB?.toFixed(6) ?? '—'} {TB?.symbol} | 1 {TB?.symbol} ≈ {priceBA?.toFixed(6) ?? '—'} {TA?.symbol}
            </small>
          </div>
        ) : (
          <div className={styles.inlineInfo}>
            <small>The pair doesn’t exist yet — first supply will create it.</small>
          </div>
        )}

        {/* Slippage / Deadline */}
        <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
          <span>Slippage:</span>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={slippage}
              onChange={e => setSlippage(Math.max(0, Number(e.target.value || 0)))}
              style={{ width: 90 }}
              placeholder="0.5"
            />
            <span>%</span>
          </div>

          <span style={{marginLeft:12}}>Deadline:</span>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <input
              type="number"
              min={1}
              value={deadlineMins}
              onChange={e => setDeadlineMins(Math.max(1, Number(e.target.value || 1)))}
              style={{ width: 90 }}
              placeholder="10"
            />
            <span>min</span>
          </div>
        </div>

        {/* Approvals en ligne */}
        <div className={styles.inlineActions}>
          {!TA?.isNative && needApproveA && (
            <button onClick={() => onApprove(TA, TA!.symbol)} disabled={pending}>
              Approve {TA?.symbol}
            </button>
          )}
          {!TB?.isNative && needApproveB && (
            <button onClick={() => onApprove(TB, TB!.symbol)} disabled={pending}>
              Approve {TB?.symbol}
            </button>
          )}
        </div>

      </div>

      <button className={styles.btnSwap} onClick={onSupply} disabled={!canSupply || pending}>
        {pending ? 'Supplying…' : 'Supply'}
      </button>
      <div className={styles.traitSwap}></div>
    </div>
  )
}
