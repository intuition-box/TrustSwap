// apps/web/src/features/pools/components/PoolsPage.tsx
import { useState } from "react";
import { PoolsTable } from "./PoolsTable";
import { PoolsFilters } from "./filters/PoolsFilters";
import { PoolsPagination } from "./filters/PoolsPagination";
import styles from "../pools.module.css";


export default function PoolsPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Pools</h1>
      <PoolsFilters query={query} onQuery={setQuery} />
      <div className={styles.tableContainer}>
        <PoolsTable page={page} query={query} />
        <PoolsPagination page={page} onPage={setPage} />
      </div>
    </div>
  );
}