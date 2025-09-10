// apps/web/src/features/pools/components/PoolsTable.tsx
import { useMemo } from "react";
import type { Address } from "viem";
import { usePoolsData } from "../hooks/usePoolsData";
import { usePairMetrics } from "../hooks/usePairMetrics";
import { useStakingData } from "../hooks/useStakingData";
import { PoolRow } from "./PoolRow";
import { usePairsVolume1D } from "../hooks/usePairsVolume1D";
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
  const pageSize = 50;
  const { items, loading, error } = usePoolsData(pageSize, (page - 1) * pageSize);

  // Skeleton pool factice pour afficher lors du loading
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

  const rowsToRender = loading
    ? Array.from({ length: pageSize }, () => skeletonPool)
    : items;

  if (error) return <div style={{ color: "#f66" }}>Error: {error}</div>;
  if (!items.length && !loading) return <div>Aucune pool</div>;

  return (
    <PoolsTableInner
      page={page}
      query={query}
      items={rowsToRender}
      loading={loading}
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
  // Ces hooks ne se montent que quand `items` est non-vide
  const { volMap, priceMap } = usePairsVolume1D(items);
  const withMetrics = usePairMetrics(items, volMap, priceMap);
  const withStaking = useStakingData(withMetrics);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withStaking;
    return withStaking.filter(
      (p) =>
        p.token0.symbol.toLowerCase().includes(q) ||
        p.token1.symbol.toLowerCase().includes(q)
    );
  }, [withStaking, query]);

  return (
    <div className={styles.tableauContainer}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead className={styles.poolFilters}>
          <tr>
            <th>#</th>
            <th>Pool</th>
            <th>TVL</th>
            <th>1D Vol</th>
            <th>Pool APR</th>
            <th>Epoch APR</th>
            <th>Reward</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p, i) => (
            <PoolRow
              key={loading ? `loading-${i}` : p.pair}
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
