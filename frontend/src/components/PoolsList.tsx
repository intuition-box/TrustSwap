import { useEffect, useState } from 'react'
import { usePublicClient, useWatchContractEvent } from 'wagmi'
import type { Address } from 'viem'
import PoolRow from './PoolRow'

const factory = import.meta.env.VITE_FACTORY_ADDRESS as Address

const FactoryABI = [
  { inputs: [], name: 'allPairsLength', outputs: [{ internalType:'uint256', name:'', type:'uint256' }], stateMutability:'view', type:'function' },
  { inputs: [{ internalType:'uint256', name:'', type:'uint256' }], name: 'allPairs', outputs: [{ internalType:'address', name:'', type:'address' }], stateMutability:'view', type:'function' },
  {
    anonymous: false,
    inputs: [
      { indexed:true, internalType:'address', name:'token0', type:'address' },
      { indexed:true, internalType:'address', name:'token1', type:'address' },
      { indexed:false,internalType:'address', name:'pair',   type:'address' },
      { indexed:false,internalType:'uint256', name:'',       type:'uint256' }
    ],
    name:'PairCreated',
    type:'event'
  }
] as const

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
        const addrs: Address[] = []
        for (let i = 0n; i < len; i++) {
          const p = await pc.readContract({ address: factory, abi: FactoryABI, functionName: 'allPairs', args: [i] }) as Address
          addrs.push(p)
        }
        if (!cancelled) setPairs(addrs)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [pc])

  useWatchContractEvent({
    address: factory,
    abi: FactoryABI,
    eventName: 'PairCreated',
    onLogs: (logs) => {
      setPairs(prev => {
        const next = new Set(prev.map(x => x.toLowerCase()))
        for (const l of logs) {
          const pair = (l.args as any).pair as Address
          if (pair) next.add(pair.toLowerCase() as Address)
        }
        return Array.from(next) as Address[]
      })
    }
  })

  return (
    <div style={{width:"100%", maxWidth: 900, marginTop:"40px"}}>
      {loading && <div>Chargement…</div>}
        {pairs.map((p) => (<PoolRow key={p} pair={p} />))}
    </div>
  )
}
