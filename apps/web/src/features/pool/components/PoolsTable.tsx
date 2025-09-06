import { useMemo } from "react";
import type { Address } from "viem";
import { usePoolsData } from "../hooks/usePoolsData";
import { usePairMetrics } from "../hooks/usePairMetrics";
import { useStakingData } from "../hooks/useStakingData";
import { PoolRow } from "./PoolRow";

export function PoolsTable({
  page,
  query,
  onOpenLiquidity,
}: {
  page: number;
  query: string;
  onOpenLiquidity: (a: Address, b: Address) => void;
}) {
  const { items, loading, error } = usePoolsData(50, (page - 1) * 50);
  const withMetrics = usePairMetrics(items);
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

  if (loading) return <div>Loading pools…</div>;
  if (error) return <div style={{ color: "#f66" }}>Error: {error}</div>;

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
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
              index={i + 1}
              pool={p}
              onOpenLiquidity={onOpenLiquidity}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
