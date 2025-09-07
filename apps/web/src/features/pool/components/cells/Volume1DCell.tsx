// apps/web/src/features/pools/components/cells/Volume1DCell.tsx
import { fmt } from "../../utils";
import styles from "../../tableau.module.css";

export function Volume1DCell({ value }: { value?: number }) {
  return <td>
    <span className={styles.dollarSymbol}>$</span>
    {fmt(value)}
    </td>;
}
