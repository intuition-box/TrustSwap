// apps/web/src/features/pools/hooks/usePairMetrics.ts
import { useMemo } from "react";
import type { PoolItem } from "../types";
import { aprFromFees } from "../utils";
import { formatUnits } from "viem";

function safeUnits(x: unknown, decimals: number): number {
  // accepte bigint / number / string et fallback 0
  try {
    if (typeof x === "bigint") return Number(formatUnits(x, decimals));
    if (typeof x === "number") return x;
    if (typeof x === "string") return Number(x);
  } catch {}
  return 0;
}

export function usePairMetrics(
  items: PoolItem[],
  volMap: Record<string, number> = {},
  priceMap: Record<string, number> = {}
) {
  return useMemo(
    () =>
      items.map((p) => {
        const p0 = priceMap[p.token0.address.toLowerCase()] ?? 0;
        const p1 = priceMap[p.token1.address.toLowerCase()] ?? 0;

        const r0 = safeUnits(p.reserve0, p.token0.decimals);
        const r1 = safeUnits(p.reserve1, p.token1.decimals);

        const tvlNative = r0 * p0 + r1 * p1; // en tTRUST
        const vol1dNative = volMap[p.pair.toLowerCase()] ?? 0;

        const poolAprPct = aprFromFees(vol1dNative, tvlNative); // 0.25% inclus côté utils

        return { ...p, tvlNative, vol1dNative, poolAprPct } as PoolItem;
      }),
    [items, volMap, priceMap]
  );
}
