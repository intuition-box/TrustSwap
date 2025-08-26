// src/components/PoolsList.tsx
import { useEffect, useState } from 'react'
import { usePublicClient, useWatchContractEvent } from 'wagmi'
import type { Address } from 'viem'
import PoolRow from './PoolRow'

const factory = import.meta.env.VITE_FACTORY_ADDRESS as Address

const FactoryABI = [
  { inputs: [], name: 'allPairsLength', outputs: [{ type:'uint256' }], stateMutability:'view', type:'function' },
  { inputs: [{ type:'uint256' }], name: 'allPairs', outputs: [{ type:'address' }], stateMutability:'view', type:'function' },
  {
    anonymous: false, name:'PairCreated', type:'event',
    inputs: [
      { indexed:true,  name:'token0', type:'address' },
      { indexed:true,  name:'token1', type:'address' },
      { indexed:false, name:'pair',   type:'address' },
      { indexed:false, name:'',       type:'uint256' }
    ],
  }
] as const

const PairABI = [
  { inputs: [], name:'token0', outputs:[{ type:'address' }], stateMutability:'view', type:'function' },
  { inputs: [], name:'token1', outputs:[{ type:'address' }], stateMutability:'view', type:'function' },
  { inputs: [], name:'getReserves', outputs:[
      { type:'uint112' }, { type:'uint112' }, { type:'uint32' }
    ], stateMutability:'view', type:'function' },
] as const

type PairMeta = { pair: Address; token0: Address; token1: Address; r0: bigint; r1: bigint }

const HIDE = (import.meta.env.VITE_HIDE_TOKENS || '')
  .toLowerCase().split(',').map(s => s.trim()).filter(Boolean)

const ONLY = (import.meta.env.VITE_SHOW_ONLY_TOKENS || '')
  .toLowerCase().split(',').map(s => s.trim()).filter(Boolean)

function shouldShowPair(meta: PairMeta) {
  const t0 = meta.token0.toLowerCase()
  const t1 = meta.token1.toLowerCase()
  if (HIDE.includes(t0) || HIDE.includes(t1)) return false
  if (meta.r0 === 0n && meta.r1 === 0n) return false // hide empty pools
  if (ONLY.length > 0 && !(ONLY.includes(t0) || ONLY.includes(t1))) return false
  return true
}

export default function PoolsList() {
  const pc = usePublicClient()
  const [pairs, setPairs] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!pc) return
      setLoading(true)
      try {
        const len = await pc.readContract({ address: factory, abi: FactoryABI, functionName: 'allPairsLength' }) as bigint
        const idx = Array.from({ length: Number(len) }, (_, i) => BigInt(i))
        const addrs = await Promise.all(
          idx.map(i => pc.readContract({ address: factory, abi: FactoryABI, functionName: 'allPairs', args: [i] }) as Promise<Address>)
        )

        // charge meta en parallèle
        const metas = await Promise.all(addrs.map(async (pair): Promise<PairMeta | null> => {
          try {
            const [token0, token1, reserves] = await Promise.all([
              pc.readContract({ address: pair, abi: PairABI, functionName: 'token0' }) as Promise<Address>,
              pc.readContract({ address: pair, abi: PairABI, functionName: 'token1' }) as Promise<Address>,
              pc.readContract({ address: pair, abi: PairABI, functionName: 'getReserves' }) as Promise<[bigint,bigint,number]>,
            ])
            const [r0, r1] = reserves
            return { pair, token0, token1, r0, r1 }
          } catch { return null }
        }))

        const shown = metas.filter(Boolean).filter(m => shouldShowPair(m as PairMeta)).map(m => (m as PairMeta).pair)
        if (!cancelled) setPairs(shown)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [pc])

  // live add: PairCreated
  useWatchContractEvent({
    address: factory,
    abi: FactoryABI,
    eventName: 'PairCreated',
    onLogs: async (logs) => {
      if (!pc) return
      for (const l of logs) {
        const { pair, token0, token1 } = l.args as any
        if (!pair) continue
        try {
          const [r0, r1] = (await pc.readContract({ address: pair, abi: PairABI, functionName: 'getReserves' }) as [bigint,bigint,number])
          const meta: PairMeta = { pair, token0, token1, r0, r1 }
          if (shouldShowPair(meta)) {
            setPairs(prev => prev.includes(pair) ? prev : [pair, ...prev])
          }
        } catch { /* ignore */ }
      }
    }
  })

  return (
    <div style={{ width:"100%", maxWidth: 900, marginTop:"40px" }}>
      {loading && <div>Loading…</div>}
      {pairs.map(p => (<PoolRow key={p} pair={p} />))}
      {!loading && pairs.length === 0 && <div>No pools to display</div>}
    </div>
  )
}
