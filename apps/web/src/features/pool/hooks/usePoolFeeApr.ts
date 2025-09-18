// apps/web/src/features/pools/hooks/usePoolFeeApr.ts
import { useMemo } from "react";
import type { PoolItem } from "../types";

/**
 * Calcule l'APR "Pool" (fees) à partir de vol1dNative et tvlNative.
 * feeBps: par défaut 30 = 0.30% (Uniswap V2).
 */
export function usePoolFeeApr(items: PoolItem[], feeBps = 30) {
  // 30 bps => 0.003
  const feeRate = feeBps / 10_000;

  return useMemo<PoolItem[]>(() => {
    const SECURE_EPS_TVL = 1e-9;               // évite division par ~0
    const MAX_REASONABLE_APR = 1_000_000;      // garde-fou en % (optionnel)

    return items.map(p => {
      const tvl = Number(p.tvlNative ?? 0);
      const vol1d = Number(p.vol1dNative ?? 0);
      let poolAprPct = 0;

      if (tvl > SECURE_EPS_TVL && vol1d > 0 && feeRate > 0) {
        const fees1d = vol1d * feeRate;
        const annualized = fees1d * 365;
        poolAprPct = (annualized / tvl) * 100;
        if (!Number.isFinite(poolAprPct) || poolAprPct < 0) poolAprPct = 0;
        if (poolAprPct > MAX_REASONABLE_APR) {
          // Si ça part trop loin, c'est quasi toujours TVL≈0 ou vol anormal.
          poolAprPct = MAX_REASONABLE_APR;
        }
      }

      return { ...p, poolAprPct };
    });
  }, [items, feeRate]);
}
