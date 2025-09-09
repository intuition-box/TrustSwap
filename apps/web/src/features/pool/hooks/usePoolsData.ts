// apps/web/src/features/pools/hooks/usePoolsData.ts
import { useEffect, useRef, useState } from "react";
import { type Address, type Abi } from "viem";
import { usePublicClient } from "wagmi";
import { abi, addresses } from "@trustswap/sdk";
import { getOrFetchToken } from "../../../lib/tokens";
import type { PoolItem } from "../types";

const chunk = <T,>(a: T[], n = 300) =>
  a.reduce<T[][]>((acc, _, i) => (i % n ? acc : [...acc, a.slice(i, i + n)]), []);

function toAbi(x: unknown): Abi { return (Array.isArray(x) ? x : (x as any)?.abi) as Abi; }
const FACTORY_ABI = toAbi(abi.UniswapV2Factory);
const PAIR_ABI    = toAbi(abi.UniswapV2Pair);
const dbg = (...args: any[]) => console.log("[usePoolsData]", ...args);

export function usePoolsData(limit = 50, offset = 0) {
  const pc = usePublicClient({ chainId: 13579 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [items, setItems]     = useState<PoolItem[]>([]);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!pc) { dbg("no public client"); return; }

    dbg("start", { limit, offset, chainId: pc?.chain?.id, hasMulticall3: !!pc.chain?.contracts?.multicall3 });

    const runId = ++runIdRef.current;
    (async () => {
      try {
        setLoading(true); setError(null);

        const factory = addresses.UniswapV2Factory as Address;
        const canMulticall = !!pc.chain?.contracts?.multicall3;
        dbg("factory", factory);

        const total = await pc.readContract({
          address: factory, abi: FACTORY_ABI, functionName: "allPairsLength",
        }) as bigint;
        dbg("total pairs", total?.toString());

        const start = Number(offset);
        const end   = Math.min(Number(total), start + limit);
        const idxs  = Array.from({ length: end - start }, (_, i) => BigInt(start + i));
        dbg("range", { start, end, count: idxs.length });

        // 1) Pairs
        const pairs: Address[] = [];
        for (const ids of chunk(idxs, 900)) {
          dbg("fetch pairs chunk", { size: ids.length, mode: canMulticall ? "multicall" : "loop" });
          const res = canMulticall
            ? await pc.multicall({
                allowFailure: false,
                contracts: ids.map((i) => ({
                  address: factory, abi: FACTORY_ABI, functionName: "allPairs", args: [i],
                })),
              })
            : await Promise.all(ids.map((i) =>
                pc.readContract({ address: factory, abi: FACTORY_ABI, functionName: "allPairs", args: [i] })
              ));
          pairs.push(...(res as Address[]));
          dbg("pairs so far", pairs.length);
        }
        if (!pairs.length) { if (runId === runIdRef.current) setItems([]); return; }

        // 2) token0 / token1 / reserves
        type Meta = { pair: Address; t0: Address; t1: Address; r0: bigint; r1: bigint };
        const metas: Meta[] = [];

        for (const grp of chunk(pairs, 300)) {
          dbg("fetch meta chunk", { size: grp.length, mode: canMulticall ? "multicall" : "loop" });
          if (canMulticall) {
            const contracts = grp.flatMap((p) => ([
              { address: p, abi: PAIR_ABI, functionName: "token0" } as const,
              { address: p, abi: PAIR_ABI, functionName: "token1" } as const,
              { address: p, abi: PAIR_ABI, functionName: "getReserves" } as const,
            ]));
            const res = await pc.multicall({ allowFailure: false, contracts });

            for (let i = 0; i < grp.length; i++) {
              const t0 = res[i * 3 + 0] as Address;
              const t1 = res[i * 3 + 1] as Address;
              const rv = res[i * 3 + 2] as any;
              const r0 = (Array.isArray(rv) ? rv[0] : (rv?.reserve0 ?? rv?._reserve0 ?? 0n)) as bigint;
              const r1 = (Array.isArray(rv) ? rv[1] : (rv?.reserve1 ?? rv?._reserve1 ?? 0n)) as bigint;
              metas.push({ pair: grp[i], t0, t1, r0, r1 });
            }
          } else {
            const batch = await Promise.all(grp.map(async (p) => {
              const [t0, t1, rv] = await Promise.all([
                pc.readContract({ address: p, abi: PAIR_ABI, functionName: "token0" }),
                pc.readContract({ address: p, abi: PAIR_ABI, functionName: "token1" }),
                pc.readContract({ address: p, abi: PAIR_ABI, functionName: "getReserves" }),
              ]) as [Address, Address, any];
              const r0 = (Array.isArray(rv) ? rv[0] : (rv?.reserve0 ?? rv?._reserve0 ?? 0n)) as bigint;
              const r1 = (Array.isArray(rv) ? rv[1] : (rv?.reserve1 ?? rv?._reserve1 ?? 0n)) as bigint;
              return { pair: p, t0, t1, r0, r1 } as Meta;
            }));
            metas.push(...batch);
          }
          dbg("metas so far", metas.length);
        }

        // 3) Enrichissement metadata tokens
        dbg("enrich tokens", { count: metas.length });
        const rows: PoolItem[] = await Promise.all(metas.map(async (m) => {
          const [t0Info, t1Info] = await Promise.all([
            getOrFetchToken(m.t0), getOrFetchToken(m.t1),
          ]);
          return {
            pair: m.pair,
            token0: t0Info,
            token1: t1Info,
            reserve0: m.r0,
            reserve1: m.r1,
            srf: addresses.StakingRewardsFactory as Address,
            staking: null,
          } satisfies PoolItem;
        }));
        dbg("rows ready", rows.length);

        if (runId === runIdRef.current) setItems(rows);
      } catch (e: any) {
        console.error("[usePoolsData] error", e);
        if (runId === runIdRef.current) setError(e?.message ?? String(e));
      } finally {
        if (runId === runIdRef.current) setLoading(false);
        dbg("done");
      }
    })();
  }, [pc?.chain?.id, limit, offset]); 

  return { loading, error, items };
}
