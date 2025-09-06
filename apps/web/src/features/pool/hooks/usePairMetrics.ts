// apps/web/src/features/pools/hooks/usePairMetrics.ts
import { useMemo } from "react";
import type { PoolItem } from "../types";
import { aprFromFees } from "../utils";


// Placeholder: assumes native pricing = 1 for TVL, and vol1d is injected later.
export function usePairMetrics(items: PoolItem[]) {
return useMemo(() =>
items.map((p) => {
const reserveNative = Number(p.reserve0) + Number(p.reserve1); // naive; replace by pricing
const tvlNative = reserveNative; // TODO: price tokens vs native or USD
const vol1dNative = 0; // TODO: subgraph/indexer replacement
const poolAprPct = aprFromFees(vol1dNative, tvlNative);
return { ...p, tvlNative, vol1dNative, poolAprPct } as PoolItem;
}),
[items]);
}