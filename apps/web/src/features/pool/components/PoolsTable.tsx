// apps/web/src/features/pools/components/PoolsTable.tsx
import { useMemo } from "react";
import { usePoolsData } from "../hooks/usePoolsData";
import { usePairMetrics } from "../hooks/usePairMetrics";
import { useStakingData } from "../hooks/useStakingData";
import { PoolRow } from "./PoolRow";
import styles from "../pools.module.css";


export function PoolsTable({ page, query }: { page: number; query: string }) {
const { items, loading, error } = usePoolsData(50, (page - 1) * 50);
const withMetrics = usePairMetrics(items);
const withStaking = useStakingData(withMetrics);


const filtered = useMemo(() => {
const q = query.trim().toLowerCase();
if (!q) return withStaking;
return withStaking.filter(p =>
p.token0.symbol.toLowerCase().includes(q) ||
p.token1.symbol.toLowerCase().includes(q)
);
}, [withStaking, query]);


if (loading) return <div className={styles.skeleton}>Loading pools…</div>;
if (error) return <div className={styles.error}>Error: {error}</div>;


return (
<div className={styles.tableWrap}>
<table className={styles.table}>
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
<PoolRow key={p.pair} index={i + 1} pool={p} />
))}
</tbody>
</table>
</div>
);
}