// apps/web/src/features/pools/components/cells/Volume1DCell.tsx
import { fmt } from "../../utils";
import styles from "../../tableau.module.css";

export function Volume1DCell({
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
