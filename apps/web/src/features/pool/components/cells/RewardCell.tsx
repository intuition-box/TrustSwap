// apps/web/src/features/pools/components/cells/RewardCell.tsx
import type { TokenInfo } from "../../types";
import { fmtUnits } from "../../utils";
import styles from "../../tableau.module.css";

export function RewardCell({
  rewardToken,
  earned,
  loading = false,
}: {
  rewardToken?: TokenInfo;
  earned?: bigint;
  loading?: boolean;
}) {
  if (!rewardToken) return <td>—</td>;

  if (loading) {
    return (
      <td>
        <div className={styles.skeletonLine}></div>
      </td>
    );
  }

  const v = earned ?? 0n;
  return (
    <td>
      {fmtUnits(v, rewardToken.decimals, 4)} {rewardToken.symbol}
    </td>
  );
}
