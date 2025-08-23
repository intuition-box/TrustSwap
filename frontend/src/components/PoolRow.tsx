import { useEffect, useState } from 'react'
import { usePublicClient, useWatchContractEvent } from 'wagmi'
import type { Address } from 'viem'
import { TOKENS } from '../tokens/intuit' 
import { fmtAmount, shortAddr } from '../lib/format'

const PairABI = [
  { inputs: [], name: 'token0', outputs: [{ internalType:'address', type:'address' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'token1', outputs: [{ internalType:'address', type:'address' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'getReserves', outputs: [
    { internalType:'uint112', name:'reserve0', type:'uint112' },
    { internalType:'uint112', name:'reserve1', type:'uint112' },
    { internalType:'uint32',  name:'blockTimestampLast', type:'uint32' },
  ], stateMutability:'view', type:'function' },
  // pour auto-update en live
  { anonymous:false, name:'Sync', type:'event', inputs:[
    { indexed:false, internalType:'uint112', name:'reserve0', type:'uint112' },
    { indexed:false, internalType:'uint112', name:'reserve1', type:'uint112' }
  ] }
] as const

const ERC20_MINI = [
  { inputs: [], name: 'symbol',   outputs: [{ type:'string' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'decimals', outputs: [{ type:'uint8'   }], stateMutability:'view', type:'function' },
] as const

function addrEq(a?: string, b?: string) {
  return a?.toLowerCase() === b?.toLowerCase()
}

function fromUnits(x: bigint, decimals: number) {
  return Number(x) / Number(10n ** BigInt(decimals))
}

export default function PoolRow({ pair }: { pair: Address }) {
  const pc = usePublicClient()
  const [t0, setT0] = useState<Address>()
  const [t1, setT1] = useState<Address>()
  const [sym0, setSym0] = useState<string>('…')
  const [sym1, setSym1] = useState<string>('…')
  const [dec0, setDec0] = useState<number>(18)
  const [dec1, setDec1] = useState<number>(18)
  const [r0, setR0] = useState<bigint>(0n)
  const [r1, setR1] = useState<bigint>(0n)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!pc) return
      // token0/token1
      const [a, b] = await Promise.all([
        pc.readContract({ address: pair, abi: PairABI, functionName: 'token0' }) as Promise<Address>,
        pc.readContract({ address: pair, abi: PairABI, functionName: 'token1' }) as Promise<Address>,
      ])
      if (cancelled) return
      setT0(a); setT1(b)

      // reserves
      const [res0, res1] = await pc.readContract({ address: pair, abi: PairABI, functionName: 'getReserves' }) as unknown as [bigint, bigint, number]
      if (cancelled) return
      setR0(res0); setR1(res1)

      // symbols/decimals avec override via TOKENS si dispo
      const m0 = TOKENS.find(x => addrEq(x.address as any, a) || addrEq(x.wrapped as any, a))
      const m1 = TOKENS.find(x => addrEq(x.address as any, b) || addrEq(x.wrapped as any, b))

      if (m0?.symbol) setSym0(m0.symbol)
      else {
        try { setSym0(await pc.readContract({ address: a, abi: ERC20_MINI, functionName: 'symbol' }) as string) }
        catch { setSym0('TOKEN0') }
      }
      if (m1?.symbol) setSym1(m1.symbol)
      else {
        try { setSym1(await pc.readContract({ address: b, abi: ERC20_MINI, functionName: 'symbol' }) as string) }
        catch { setSym1('TOKEN1') }
      }

      if (typeof m0?.decimals === 'number') setDec0(m0.decimals)
      else {
        try { setDec0(Number(await pc.readContract({ address: a, abi: ERC20_MINI, functionName: 'decimals' })) || 18) }
        catch { setDec0(18) }
      }
      if (typeof m1?.decimals === 'number') setDec1(m1.decimals)
      else {
        try { setDec1(Number(await pc.readContract({ address: b, abi: ERC20_MINI, functionName: 'decimals' })) || 18) }
        catch { setDec1(18) }
      }
    })()
    return () => { cancelled = true }
  }, [pc, pair])

  // live update des réserves
  useWatchContractEvent({
    address: pair,
    abi: PairABI,
    eventName: 'Sync',
    onLogs: (logs) => {
      for (const l of logs) {
        const { reserve0, reserve1 } = l.args as any
        if (typeof reserve0 === 'bigint') setR0(reserve0)
        if (typeof reserve1 === 'bigint') setR1(reserve1)
      }
    }
  })

  const price = r0 > 0n ? (Number(r1) / Number(r0)) * (10 ** (dec0 - dec1)) : null

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'8px 12px', border:'1px solid #eee', borderRadius:12}}>
      <div>
        <div style={{fontWeight:600}}>{sym0} / {sym1}</div>
        <small>{shortAddr(pair)}</small>
      </div>
      <div>
        <div>Reserve {sym0}: {fmtAmount(r0, dec0, { compact: true })}</div>
        <div>Reserve {sym1}: {fmtAmount(r1, dec1, { compact: true })}</div>
      </div>
      <div>
        <div>Price: {price ? `1 ${sym0} ≈ ${(price).toFixed(6)} ${sym1}` : '—'}</div>
      </div>
    </div>
  )
}
