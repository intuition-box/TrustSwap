// apps/web/src/features/pools/components/PoolsTable.tsx
import { useMemo } from "react";
import type { Address } from "viem";

import { usePoolsData } from "../hooks/usePoolsData";
import { usePairMetrics } from "../hooks/usePairMetrics";
import { useStakingData } from "../hooks/useStakingData";
import { PoolRow } from "./PoolRow";
import { usePairsVolume1D } from "../hooks/usePairsVolume1D";
import { usePoolFeeApr } from "../hooks/usePoolFeeApr";
import styles from "../tableau.module.css";
import type { PoolItem } from "../types";

import { shouldHidePair } from "../../../lib/tokenFilters";

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
  const { items, loading, error } = usePoolsData(pageSize, (page - 1) * pageSize);

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
                index={(page - 1) * pageSize + i + 1}
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
  const baseItems = useMemo(() => {
    return items.filter((p) =>
      !shouldHidePair(
        { address: p.token0.address, symbol: p.token0.symbol, decimals: p.token0.decimals },
        { address: p.token1.address, symbol: p.token1.symbol, decimals: p.token1.decimals },
        {
          includeTest: false,    // cache les tokens marqués test
          allowImported: false,  // override importé non nécessaire côté pools
        }
      )
    );
  }, [items]);

  const { volMap, priceMap } = usePairsVolume1D(baseItems);

  const withMetrics = usePairMetrics(baseItems, volMap, priceMap);

  const withPoolApr = usePoolFeeApr(withMetrics, /* feeBps= */ 30);

  const withStaking = useStakingData(withPoolApr);

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = !q
      ? withStaking
      : withStaking.filter(
          (p) =>
            p.token0.symbol.toLowerCase().includes(q) ||
            p.token1.symbol.toLowerCase().includes(q)
        );

    const hasPos = (p: typeof withStaking[number]) =>
      (p.stakedBalance ?? 0n) > 0n || (p.walletLpBalance ?? 0n) > 0n;

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
              index={(page - 1) * pageSize + i + 1}
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
