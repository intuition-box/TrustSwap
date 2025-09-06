// apps/web/src/features/pools/components/cells/RewardCell.tsx
import type { TokenInfo } from "../../types";
import { fmtUnits } from "../../utils";

export function RewardCell({
  rewardToken,
  earned,
}: {
  rewardToken?: TokenInfo;
  earned?: bigint;
}) {
  if (!rewardToken) return <td>—</td>;
  const v = earned ?? 0n;
  return (
    <td>
      {fmtUnits(v, rewardToken.decimals, 4)} {rewardToken.symbol}
    </td>
  );
}
