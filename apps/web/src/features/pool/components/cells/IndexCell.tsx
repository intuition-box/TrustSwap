// apps/web/src/features/pools/components/cells/IndexCell.tsx
import styles from "../../tableau.module.css";

export function IndexCell({
  index,
  loading = false,
}: {
  index: number;
  loading?: boolean;
}) {
  return (
    <td>
      {loading ? <div className={styles.skeletonLine}></div> : index}
    </td>
  );
}
