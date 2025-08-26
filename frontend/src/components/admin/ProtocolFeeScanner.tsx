// src/components/admin/ProtocolFeeScanner.tsx
import React, { useCallback, useMemo, useState } from "react"
import { usePublicClient } from "wagmi"

const factoryAbi = [
  { type:"function", name:"allPairsLength", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}]},
  { type:"function", name:"allPairs",       stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"address"}]},
  { type:"function", name:"feeTo",          stateMutability:"view", inputs:[], outputs:[{type:"address"}]},
] as const

const pairAbi = [
  { type:"function", name:"token0",       stateMutability:"view", inputs:[], outputs:[{type:"address"}]},
  { type:"function", name:"token1",       stateMutability:"view", inputs:[], outputs:[{type:"address"}]},
  { type:"function", name:"getReserves",  stateMutability:"view", inputs:[], outputs:[{type:"uint112"},{type:"uint112"},{type:"uint32"}]},
  { type:"function", name:"totalSupply",  stateMutability:"view", inputs:[], outputs:[{type:"uint256"}]},
  { type:"function", name:"kLast",        stateMutability:"view", inputs:[], outputs:[{type:"uint256"}]},
  { type:"function", name:"symbol",       stateMutability:"view", inputs:[], outputs:[{type:"string"}]},
  { type:"function", name:"decimals",     stateMutability:"view", inputs:[], outputs:[{type:"uint8"}]},
] as const

const erc20Abi = [
  { type:"function", name:"symbol",       stateMutability:"view", inputs:[], outputs:[{type:"string"}]},
  { type:"function", name:"decimals",     stateMutability:"view", inputs:[], outputs:[{type:"uint8"}]},
  { type:"function", name:"balanceOf",    stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"uint256"}]},
] as const

type Row = {
  index: number
  pair: `0x${string}`
  token0: `0x${string}`
  token1: `0x${string}`
  sym0: string
  sym1: string
  reserves0: bigint
  reserves1: bigint
  dec0: number
  dec1: number
  totalSupply: bigint
  kLast: bigint
  lpBalanceTreasury: bigint
  pendingLp: bigint
  estAmt0: bigint
  estAmt1: bigint
}

function sqrtBI(n: bigint): bigint {
  if (n <= 0n) return 0n
  let x0 = n
  let x1 = (n >> 1n) + 1n
  while (x1 < x0) { x0 = x1; x1 = (x1 + n / x1) >> 1n }
  return x0
}

function fmtBig(amount: bigint, decimals = 18, max = 6) {
  // simple formatUnits sans dépendance externe
  const neg = amount < 0n
  const n = neg ? -amount : amount
  const base = 10n ** BigInt(decimals)
  const int = n / base
  const frac = n % base
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, Math.max(0, max))
  return `${neg ? "-" : ""}${int.toString()}${max > 0 ? (fracStr ? "." + fracStr.replace(/0+$/, "") : "") : ""}`
}

function percent(n: number, digits = 4) {
  if (!Number.isFinite(n)) return "—"
  return `${(n * 100).toFixed(digits)}%`
}

async function fetchPairRow(pub: any, i: number, factory: `0x${string}`, treasury: `0x${string}`): Promise<Row> {
  const pair = await pub.readContract({ address: factory, abi: factoryAbi, functionName: "allPairs", args: [BigInt(i)] }) as `0x${string}`
  const [token0, token1] = await Promise.all([
    pub.readContract({ address: pair, abi: pairAbi, functionName: "token0" }) as Promise<`0x${string}`>,
    pub.readContract({ address: pair, abi: pairAbi, functionName: "token1" }) as Promise<`0x${string}`>,
  ])

  const [[r0, r1], totalSupply, kLast, lpBal, dec0, dec1, sym0, sym1] = await Promise.all([
    pub.readContract({ address: pair, abi: pairAbi, functionName: "getReserves" }) as Promise<[bigint, bigint, number]>,
    pub.readContract({ address: pair, abi: pairAbi, functionName: "totalSupply" }) as Promise<bigint>,
    pub.readContract({ address: pair, abi: pairAbi, functionName: "kLast" }) as Promise<bigint>,
    pub.readContract({ address: pair, abi: erc20Abi, functionName: "balanceOf", args: [treasury] }) as Promise<bigint>,
    pub.readContract({ address: token0, abi: erc20Abi, functionName: "decimals" }).catch(()=>18) as Promise<number>,
    pub.readContract({ address: token1, abi: erc20Abi, functionName: "decimals" }).catch(()=>18) as Promise<number>,
    pub.readContract({ address: token0, abi: erc20Abi, functionName: "symbol" }).catch(()=> "T0") as Promise<string>,
    pub.readContract({ address: token1, abi: erc20Abi, functionName: "symbol" }).catch(()=> "T1") as Promise<string>,
  ])

  const k = r0 * r1
  const rootK = sqrtBI(k)
  const rootKLast = sqrtBI(kLast)

  let pendingLp = 0n
  if (kLast !== 0n && rootK > rootKLast) {
    // Uniswap V2 formula: liquidity = totalSupply*(√k − √kLast) / (5√k + √kLast)
    const numerator = totalSupply * (rootK - rootKLast)
    const denominator = rootK * 5n + rootKLast
    if (denominator > 0n) pendingLp = numerator / denominator
  }

  // Estimate underlying token amounts for pending LP (approx: share = pending / totalSupply)
  const estAmt0 = totalSupply > 0n ? (pendingLp * r0) / totalSupply : 0n
  const estAmt1 = totalSupply > 0n ? (pendingLp * r1) / totalSupply : 0n

  return {
    index: i, pair, token0, token1, sym0, sym1,
    reserves0: r0, reserves1: r1,
    dec0, dec1, totalSupply, kLast,
    lpBalanceTreasury: lpBal,
    pendingLp, estAmt0, estAmt1
  }
}

export default function ProtocolFeeScanner({
  factory = import.meta.env.VITE_FACTORY_ADDRESS as `0x${string}`,
  treasury = import.meta.env.VITE_PROTOCOL_TREASURY as `0x${string}`,
  limit = 100,
  concurrency = 8
}: {
  factory?: `0x${string}`
  treasury?: `0x${string}`
  limit?: number
  concurrency?: number
}) {
  const pub = usePublicClient()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [err, setErr] = useState<string | null>(null)
  const [feeToMatch, setFeeToMatch] = useState<"unknown" | "ok" | "mismatch">("unknown")

  const totalPendingLp = useMemo(() => rows?.reduce((a, r) => a + r.pendingLp, 0n) ?? 0n, [rows])
  const totalLpBal = useMemo(() => rows?.reduce((a, r) => a + r.lpBalanceTreasury, 0n) ?? 0n, [rows])

  const scan = useCallback(async () => {
    if (!pub || !factory || !treasury) return
    setErr(null); setRows(null); setLoading(true); setProgress({ done: 0, total: 0 }); setFeeToMatch("unknown")
    try {
      const feeTo = await pub.readContract({ address: factory, abi: factoryAbi, functionName: "feeTo" }) as string
      setFeeToMatch(feeTo.toLowerCase() === treasury.toLowerCase() ? "ok" : "mismatch")

      const len = await pub.readContract({ address: factory, abi: factoryAbi, functionName: "allPairsLength" }) as bigint
      const count = Math.min(Number(len), limit)
      setProgress({ done: 0, total: count })

      // Chunked concurrency
      const out: Row[] = []
      let i = 0
      async function worker() {
        while (i < count) {
          const my = i++
          try {
            const row = await fetchPairRow(pub, my, factory, treasury)
            out[my] = row
          } catch (e) {
            // keep placeholder with minimal info
            out[my] = {
              index: my, pair: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              token0: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              token1: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              sym0: "?", sym1: "?", reserves0: 0n, reserves1: 0n,
              dec0: 18, dec1: 18, totalSupply: 0n, kLast: 0n,
              lpBalanceTreasury: 0n, pendingLp: 0n, estAmt0: 0n, estAmt1: 0n
            }
          }
          setProgress(p => ({ done: Math.min(p.done + 1, count), total: count }))
        }
      }
      await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, count)) }, () => worker()))
      setRows(out)
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Scan failed")
    } finally {
      setLoading(false)
    }
  }, [pub, factory, treasury, limit, concurrency])

  return (
    <div className="p-4 border rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm opacity-70">Factory</div>
          <div className="font-mono text-xs break-all">{factory}</div>
          <div className="text-sm mt-1">Treasury: <span className="font-mono">{treasury}</span></div>
          {feeToMatch !== "unknown" && (
            <div className={`text-xs mt-1 ${feeToMatch === "ok" ? "text-green-600" : "text-amber-600"}`}>
              Protocol fee {feeToMatch === "ok" ? "ON for this treasury" : "feeTo != treasury (mismatch)"}
            </div>
          )}
        </div>
        <div className="text-right">
          <button
            className="border rounded px-3 py-1 disabled:opacity-60"
            onClick={scan}
            disabled={loading || !pub}
          >
            {loading ? `Scanning… ${progress.done}/${progress.total}` : "Scan protocol fees"}
          </button>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm mt-3">{err}</div>}

      {rows && (
        <>
          <div className="mt-4 text-sm">
            <b>Summary</b>: LP in treasury = <span className="font-mono">{totalLpBal.toString()}</span> •
            pending LP (all pairs) ≈ <span className="font-mono">{totalPendingLp.toString()}</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Pair</th>
                  <th className="py-2 pr-3">Reserves</th>
                  <th className="py-2 pr-3">LP supply</th>
                  <th className="py-2 pr-3">LP (treasury)</th>
                  <th className="py-2 pr-3">Pending LP</th>
                  <th className="py-2 pr-3">Est. token0</th>
                  <th className="py-2 pr-3">Est. token1</th>
                  <th className="py-2 pr-3">% supply</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pct = Number(r.totalSupply === 0n ? 0 : Number(r.pendingLp) / Number(r.totalSupply))
                  return (
                    <tr key={r.index} className="border-b hover:bg-black/5">
                      <td className="py-1 pr-3">{r.index}</td>
                      <td className="py-1 pr-3">
                        <div className="font-mono text-xs">{r.pair}</div>
                        <div>{r.sym0} – {r.sym1}</div>
                      </td>
                      <td className="py-1 pr-3">
                        {fmtBig(r.reserves0, r.dec0)} {r.sym0} · {fmtBig(r.reserves1, r.dec1)} {r.sym1}
                      </td>
                      <td className="py-1 pr-3 font-mono">{r.totalSupply.toString()}</td>
                      <td className="py-1 pr-3 font-mono">{r.lpBalanceTreasury.toString()}</td>
                      <td className="py-1 pr-3 font-mono">{r.pendingLp.toString()}</td>
                      <td className="py-1 pr-3">{fmtBig(r.estAmt0, r.dec0)} {r.sym0}</td>
                      <td className="py-1 pr-3">{fmtBig(r.estAmt1, r.dec1)} {r.sym1}</td>
                      <td className="py-1 pr-3">{percent(pct, 4)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}



{/*
  <ProtocolFeeScanner
    // factory={import.meta.env.VITE_FACTORY_ADDRESS as `0x${string}`} // optionnel (par défaut env)
    // treasury={import.meta.env.VITE_PROTOCOL_TREASURY as `0x${string}`} // optionnel
    limit={100}         // nombre max de paires à scanner
    concurrency={8}     // requêtes parallèles
  />
/*} 