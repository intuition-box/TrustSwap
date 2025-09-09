// apps/web/src/features/pools/hooks/usePoolsData.ts
import { useEffect, useState } from "react";
import { type Address, type Abi } from "viem";
import { usePublicClient } from "wagmi";
import { abi, addresses } from "@trustswap/sdk";
import { getOrFetchToken } from "../../../lib/tokens";
import type { PoolItem } from "../types";

// --- helpers ---
function toAbi(x: unknown): Abi { return (Array.isArray(x) ? x : (x as any)?.abi) as Abi; }
const FACTORY_ABI = toAbi(abi.UniswapV2Factory);
const PAIR_ABI    = toAbi(abi.UniswapV2Pair);
const chunk = <T,>(a: T[], n = 300) =>
  a.reduce<T[][]>((acc, _, i) => (i % n ? acc : [...acc, a.slice(i, i + n)]), []);

export function usePoolsData(limit = 50, offset = 0) {
  const pc = usePublicClient({ chainId: 13579 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [items, setItems]     = useState<PoolItem[]>([]);

  useEffect(() => {
    if (!pc) return;
    (async () => {
      try {
        setLoading(true); setError(null);
        const factory = addresses.UniswapV2Factory as Address;
        const canMulticall = !!pc.chain?.contracts?.multicall3;

        const total = await pc.readContract({
          address: factory, abi: FACTORY_ABI, functionName: "allPairsLength",
        }) as bigint;

        const start = Number(offset);
        const end   = Math.min(Number(total), start + limit);
        const idxs  = Array.from({ length: end - start }, (_, i) => BigInt(start + i));

        // 1) Pairs
        const pairs: Address[] = [];
        for (const ids of chunk(idxs, 900)) {
          if (canMulticall) {
            const res = await pc.multicall({
              allowFailure: false,
              contracts: ids.map((i) => ({
                address: factory, abi: FACTORY_ABI, functionName: "allPairs", args: [i],
              })),
            });
            pairs.push(...(res as Address[]));
          } else {
            const res = await Promise.all(ids.map((i) =>
              pc.readContract({ address: factory, abi: FACTORY_ABI, functionName: "allPairs", args: [i] })
            )) as Address[];
            pairs.push(...res);
          }
        }
        if (!pairs.length) { setItems([]); setLoading(false); return; }

        // 2) token0 / token1 / reserves
        type Meta = { pair: Address; t0: Address; t1: Address; r0: bigint; r1: bigint };
        const metas: Meta[] = [];
        for (const grp of chunk(pairs, 300)) {
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
              const r  = res[i * 3 + 2] as any;
              const r0 = (Array.isArray(r) ? r[0] : (r?.reserve0 ?? r?._reserve0 ?? 0n)) as bigint;
              const r1 = (Array.isArray(r) ? r[1] : (r?.reserve1 ?? r?._reserve1 ?? 0n)) as bigint;
              metas.push({ pair: grp[i], t0, t1, r0, r1 });
            }
          } else {
            const batch = await Promise.all(grp.map(async (p) => {
              const [t0, t1, r] = await Promise.all([
                pc.readContract({ address: p, abi: PAIR_ABI, functionName: "token0" }),
                pc.readContract({ address: p, abi: PAIR_ABI, functionName: "token1" }),
                pc.readContract({ address: p, abi: PAIR_ABI, functionName: "getReserves" }),
              ]) as [Address, Address, any];
              const r0 = (Array.isArray(r) ? r[0] : (r?.reserve0 ?? r?._reserve0 ?? 0n)) as bigint;
              const r1 = (Array.isArray(r) ? r[1] : (r?.reserve1 ?? r?._reserve1 ?? 0n)) as bigint;
              return { pair: p, t0, t1, r0, r1 } as Meta;
            }));
            metas.push(...batch);
          }
        }

        // 3) Enrichit avec les métadonnées token
        const rows: PoolItem[] = await Promise.all(metas.map(async (m) => {
          const [t0Info, t1Info] = await Promise.all([
            getOrFetchToken(m.t0), getOrFetchToken(m.t1),
          ]);
          return {
            pair: m.pair, token0: t0Info, token1: t1Info,
            reserve0: m.r0, reserve1: m.r1,
            srf: addresses.StakingRewardsFactory as Address,
            staking: null,
          } satisfies PoolItem;
        }));

        setItems(rows);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [pc, limit, offset]);

  return { loading, error, items };
}
