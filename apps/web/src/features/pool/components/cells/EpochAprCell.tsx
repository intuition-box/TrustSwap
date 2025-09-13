// EpochAprCell.tsx
import { pct } from "../../utils";
import styles from "../../tableau.module.css";

export function EpochAprCellContent({
  value,
  loading,
}: {
  value?: number;
  loading?: boolean;
}) {
  if (loading || value === undefined || value === null) {
    return <div className={styles.skeletonLine}></div>;
  }
  return <>{pct(value)}</>;
}

export function EpochAprCell(props: { value?: number; loading?: boolean }) {
  return (
    <td>
      <EpochAprCellContent {...props} />
    </td>
  );
}
