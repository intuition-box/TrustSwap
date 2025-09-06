// apps/web/src/features/pools/components/filters/PoolsFilters.tsx
import styles from "../../pools.module.css";
export function PoolsFilters({ query, onQuery }:{ query: string; onQuery: (v:string)=>void }){
return (
<div className={styles.filters}>
<input value={query} onChange={e=>onQuery(e.target.value)} placeholder="Search token / pair"/>
</div>
);
}


