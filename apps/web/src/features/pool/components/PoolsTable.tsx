// apps/web/src/features/pools/components/PoolsTable.tsx
import { useMemo } from "react";
import type { Address } from "viem";

import { usePoolsData } from "../hooks/usePoolsData";
import { usePairsVolume1D } from "../hooks/usePairsVolume1D";
import { usePairMetrics } from "../hooks/usePairMetrics";
import { usePoolFeeApr } from "../hooks/usePoolFeeApr";
import { useStakingData } from "../hooks/useStakingData"; 

import { PoolRow } from "./PoolRow";
import styles from "../tableau.module.css";
import type { PoolItem } from "../types";

export function PoolsTable({
  page,
  query,
  onOpenLiquidity,
}: {
  page: number;
  query: string;
  onOpenLiquidity: (a: Address, b: Address) => void;
}) {
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const { items, loading, error } = usePoolsData(pageSize, offset);

  const skeletonPool: PoolItem = {
    pair: "0x0000000000000000000000000000000000000000",
    token0: { symbol: "", address: "" as `0x${string}`, decimals: 18 },
    token1: { symbol: "", address: "" as `0x${string}`, decimals: 18 },
    reserve0: 0n,
    reserve1: 0n,
    tvlNative: 0,
    vol1dNative: 0,
    poolAprPct: 0,
    epochAprPct: 0,
    rewardToken: { symbol: "", address: "" as `0x${string}`, decimals: 18 },
    earned: 0n,
  };

  if (error) return <div style={{ color: "#f66" }}>Error: {error}</div>;

  if (loading) {
    return (
      <div className={styles.tableauContainer}>
        <table>
          <thead className={styles.poolFilters}>
            <tr>
              <th>#</th>
              <th>Pool</th>
              <th>TVL</th>
              <th>1D Vol</th>
              <th>Pool APR</th>
              <th>Farming</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: pageSize }).map((_, i) => (
              <PoolRow
                key={`loading-${i}`}
                index={offset + i + 1}
                pool={skeletonPool}
                loading={true}
                onOpenLiquidity={onOpenLiquidity}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!items.length) return <div>Aucune pool</div>;

  return (
    <PoolsTableInner
      page={page}
      query={query}
      items={items}
      loading={false}
      onOpenLiquidity={onOpenLiquidity}
      pageSize={pageSize}
    />
  );
}

function PoolsTableInner({
  page,
  query,
  items,
  loading,
  onOpenLiquidity,
  pageSize,
}: {
  page: number;
  query: string;
  items: PoolItem[];
  loading: boolean;
  onOpenLiquidity: (a: Address, b: Address) => void;
  pageSize: number;
}) {
  const { volMap, priceMap } = usePairsVolume1D(items);

  const withMetrics = usePairMetrics(items, volMap, priceMap);

  const withPoolApr = usePoolFeeApr(withMetrics, /* feeBps= */ 30);

  const withStaking = useStakingData(withPoolApr);

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = !q
      ? withStaking
      : withStaking.filter(
          (p) =>
            (p.token0?.symbol ?? "").toLowerCase().includes(q) ||
            (p.token1?.symbol ?? "").toLowerCase().includes(q)
        );

    const hasPos = (p: PoolItem) =>
      (p.stakedBalance ?? 0n) > 0n || (p.walletLpBalance ?? 0n) > 0n;

    // Tri: d'abord pools où user a une position, puis TVL décroissante, puis adresse
    return [...filtered].sort((a, b) => {
      const aPos = hasPos(a) ? 1 : 0;
      const bPos = hasPos(b) ? 1 : 0;
      if (aPos !== bPos) return bPos - aPos;

      const at = a.tvlNative ?? 0;
      const bt = b.tvlNative ?? 0;
      if (bt !== at) return bt - at;

      const aKey = String(a.pair).toLowerCase();
      const bKey = String(b.pair).toLowerCase();
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
  }, [withStaking, query]);

  const offset = (page - 1) * pageSize;

  return (
    <div className={styles.tableauContainer}>
      <table>
        <thead className={styles.poolFilters}>
          <tr>
            <th>#</th>
            <th>Pool</th>
            <th>TVL</th>
            <th>1D Vol</th>
            <th>Pool APR</th>
            <th>Farming</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {view.map((p, i) => (
            <PoolRow
              key={`${String(p.pair).toLowerCase()}-${i}`}
              index={offset + i + 1}
              pool={p}
              loading={loading}
              onOpenLiquidity={onOpenLiquidity}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
