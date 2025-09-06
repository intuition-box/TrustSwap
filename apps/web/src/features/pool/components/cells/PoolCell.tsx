// apps/web/src/features/pools/components/cells/PoolCell.tsx
import type { TokenInfo } from "../../types";
import styles from "../../pools.module.css";

export function PoolCell({ token0, token1 }: { token0: TokenInfo; token1: TokenInfo }) {
  return (
    <td>
      <div className={styles.poolCell}>
        <span className={styles.pairBadges}>
        </span>
        <span>{token0.symbol}/{token1.symbol}</span>
      </div>
    </td>
  );
}
