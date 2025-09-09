// apps/web/src/features/pools/components/cells/EpochAprCell.tsx
import { pct } from "../../utils";
import styles from "../../tableau.module.css";

export function EpochAprCell({ value, loading }: { value?: number; loading?: boolean }) {
  return (
    <td>
      {loading || value === undefined || value === null ? (
        <div className={styles.skeletonLine}></div>
      ) : (
        pct(value)
      )}
    </td>
  );
}
