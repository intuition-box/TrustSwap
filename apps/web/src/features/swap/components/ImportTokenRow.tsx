// ImportTokenRow.tsx
import React from "react";
import type { Address } from "viem";
import { isAddress } from "viem";
import styles from "@ui/styles/TokenSelector.module.css";

export function ImportTokenRow({
  query,
  onImport,
  disabled,
}: {
  query: string;
  onImport: (t: { address: Address; symbol: string }) => void;
  disabled?: boolean;
}) {
  const valid = isAddress(query as Address);
  if (!valid) return null;

  return (
    <div className={styles.importRow}>
      <div className={styles.importInfo}>
        <span className={styles.importBadge}>Unlisted</span>
        <span className={styles.addr}>
          {query.slice(0, 6)}…{query.slice(-4)}
        </span>
      </div>
      <button
        className={styles.importBtn}
        onClick={() =>
          onImport({ address: query as Address, symbol: "CUSTOM" })
        }
        disabled={disabled}
      >
        Import
      </button>
    </div>
  );
}
