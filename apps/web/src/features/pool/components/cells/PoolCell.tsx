import type { Address } from "viem";
import type { TokenInfo } from "../../types";
import { getTokenIcon } from "../../../../lib/getTokenIcon";
import styles from "../../tableau.module.css";

export function PoolCell({
  token0,
  token1,
  pair,
  onOpenLiquidity,
}: {
  token0: TokenInfo;
  token1: TokenInfo;
  pair: string;
  onOpenLiquidity?: (a: Address, b: Address) => void;
}) {
  return (
    <td>
      <div className={styles.containerTokenTab}>
        {/* token0 */}
        <span className={styles.tokenName}>
          <img
            src={getTokenIcon(token0.address)}
            alt={token0.symbol}
            className={styles.tokenSymbol}
          />
          {token0.symbol}
        </span>

        {/* token1 */}
        <span className={styles.tokenName}>
          <img
            src={getTokenIcon(token1.address)}
            alt={token1.symbol}
            className={styles.tokenSymbol}
          />
          {token1.symbol}
        </span>
        </div>
    </td>
  );
}