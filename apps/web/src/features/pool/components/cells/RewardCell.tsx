// RewardCell.tsx
import type { TokenInfo } from "../../types";
import { fmtUnits } from "../../utils";
import styles from "../../tableau.module.css";

export function RewardCellContent({
  rewardToken,
  earned,
  loading = false,
}: {
  rewardToken?: TokenInfo;
  earned?: bigint;
  loading?: boolean;
}) {
  if (!rewardToken) return <>—</>;

  if (loading) {
    return <div className={styles.skeletonLine}></div>;
  }

  const v = earned ?? 0n;
  return (
    <>
      {fmtUnits(v, rewardToken.decimals, 4)} {rewardToken.symbol}
    </>
  );
}

export function RewardCell(props: {
  rewardToken?: TokenInfo;
  earned?: bigint;
  loading?: boolean;
}) {
  return (
    <td>
      <RewardCellContent {...props} />
    </td>
  );
}
