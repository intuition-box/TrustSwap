import { pct } from "../../utils";
import styles from "../../tableau.module.css";

export function EpochAprCellContent({
  value,
  loading,
  expired,
}: {
  value?: number;
  loading?: boolean;
  expired?: boolean;
}) {
  if (loading) return <div className={styles.skeletonLine}></div>;
  if (expired) return <span className={styles.expiredBadge}>Expired</span>;
  return <>{pct(value)}</>;
}

export function EpochAprCell(props: { value?: number; loading?: boolean; expired?: boolean }) {
  return (
    <td>
      <EpochAprCellContent {...props} />
    </td>
  );
}
