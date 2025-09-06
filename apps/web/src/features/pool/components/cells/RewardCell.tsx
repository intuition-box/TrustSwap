// apps/web/src/features/pools/components/cells/RewardCell.tsx
import type { TokenInfo } from "../../types";
import { fmtUnits } from "../../utils";

export function RewardCell({ rewardToken, ratePerSec }: { rewardToken?: TokenInfo; ratePerSec?: bigint }) {
  if (!rewardToken || !ratePerSec) return <td>—</td>;
  return (
    <td>
      {fmtUnits(ratePerSec, rewardToken.decimals, 6)} {rewardToken.symbol}/s
    </td>
  );
}
