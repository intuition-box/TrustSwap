import React from "react";
import type { Address } from "viem";
import { isAddress } from "viem";
import styles from "@ui/styles/TokenSelector.module.css";

export function ImportTokenRow({
  query,
  onImport,
  disabled,
}: { query: string; onImport: () => void; disabled?: boolean }) {
  if (!isAddress(query as Address)) return null;
  return (
    <div className={styles.importRow}>
      <div className={styles.importInfo}>
        <span className={styles.importBadge}>Unlisted</span>
        <span className={styles.addr}>{query.slice(0,6)}…{query.slice(-4)}</span>
      </div>
      <button className={styles.importBtn} onMouseDown={(e) => { e.preventDefault(); if (!disabled) onImport(); }} disabled={disabled}>
        Import
      </button>
    </div>
  );
}
