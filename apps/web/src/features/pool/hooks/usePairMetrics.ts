// apps/web/src/features/pools/hooks/usePairMetrics.ts
import { useMemo } from "react";
import type { PoolItem } from "../types";
import { aprFromFees } from "../utils";
import { formatUnits } from "viem";
import { WNATIVE_ADDRESS } from "../../../lib/tokens";

function safeUnits(x: unknown, decimals: number): number {
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
  const w = WNATIVE_ADDRESS.toLowerCase();

  return useMemo(() => {
    return items.map((p) => {
      // Prix token -> WTTRUST (fallback: 1 pour WTTRUST, 0 sinon)
      const p0 =
        priceMap[p.token0.address.toLowerCase()] ??
        (p.token0.address.toLowerCase() === w ? 1 : 0);
      const p1 =
        priceMap[p.token1.address.toLowerCase()] ??
        (p.token1.address.toLowerCase() === w ? 1 : 0);

      // Reserves -> quantités en unités humaines
      const r0 = safeUnits(p.reserve0, p.token0.decimals);
      const r1 = safeUnits(p.reserve1, p.token1.decimals);

      // TVL en WTTRUST
      const tvlNative = r0 * p0 + r1 * p1;

      // Volume 24h (WTTRUST) venant du hook de logs
      const vol1dNative = volMap[p.pair.toLowerCase()] ?? 0;

      // APR pool annuel (en %)
      const poolAprPct = aprFromFees(vol1dNative, tvlNative);

      return { ...p, tvlNative, vol1dNative, poolAprPct } as PoolItem;
    });
  }, [items, volMap, priceMap]);
}
