// apps/web/src/features/pools/components/PoolsTable.tsx
import { useMemo } from "react";
import type { Address } from "viem";
import { usePoolsData } from "../hooks/usePoolsData";
import { usePairMetrics } from "../hooks/usePairMetrics";
import { useStakingData } from "../hooks/useStakingData";
import { PoolRow } from "./PoolRow";
import { usePairsVolume1D } from "../hooks/usePairsVolume1D";
import styles from "../tableau.module.css";

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

  if (loading) return <div>Loading pools…</div>;
  if (error)   return <div style={{ color: "#f66" }}>Error: {error}</div>;
  if (!items.length) return <div>Aucune pool</div>;

  return (
    <PoolsTableInner
      page={page}
      query={query}
      items={items}
      onOpenLiquidity={onOpenLiquidity}
      pageSize={pageSize}
    />
  );
}

function PoolsTableInner({
  page,
  query,
  items,
  onOpenLiquidity,
  pageSize,
}: {
  page: number;
  query: string;
  items: ReturnType<typeof usePoolsData>["items"];
  onOpenLiquidity: (a: Address, b: Address) => void;
  pageSize: number;
}) {
  // ⬇️ Ces hooks ne se montent que quand `items` est non-vide
  const { volMap, priceMap }   = usePairsVolume1D(items);
  const withMetrics            = usePairMetrics(items, volMap, priceMap);
  const withStaking            = useStakingData(withMetrics);

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
    <div style={{ overflow: "auto" }}>
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
              key={p.pair}
              index={(page - 1) * pageSize + i + 1}
              pool={p}
              onOpenLiquidity={onOpenLiquidity}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
