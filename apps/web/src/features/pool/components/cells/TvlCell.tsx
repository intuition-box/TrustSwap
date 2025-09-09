// apps/web/src/features/pools/components/cells/TvlCell.tsx
import { fmt } from "../../utils";
import styles from "../../tableau.module.css";

export function TvlCell({
  value,
  loading = false,
}: {
  value?: number;
  loading?: boolean;
}) {
  return (
    <td>
      {loading ? (
        <div className={styles.skeletonLine}></div>
      ) : (
        <>
          <span className={styles.dollarSymbol}>$</span>
          {fmt(value)}
        </>
      )}
    </td>
  );
}
