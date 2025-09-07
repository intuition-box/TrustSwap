// apps/web/src/features/pools/components/cells/TvlCell.tsx
import { fmt } from "../../utils";
import styles from "../../tableau.module.css";

export function TvlCell({ value }: { value?: number }) {
  return <td>
    <span className={styles.dollarSymbol}>$</span>
    {fmt(value)}
  </td>;
}
