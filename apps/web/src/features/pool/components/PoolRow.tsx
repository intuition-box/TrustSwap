import type { Address } from "viem";
import type { PoolItem } from "../types";
import { IndexCell } from "./cells/IndexCell";
import { PoolCell } from "./cells/PoolCell";
import { TvlCell } from "./cells/TvlCell";
import { Volume1DCell } from "./cells/Volume1DCell";
import { PoolAprCell } from "./cells/PoolAprCell";
import { EpochAprCell } from "./cells/EpochAprCell";
import { RewardCell } from "./cells/RewardCell";
import { StakeClaimCell } from "./cells/StakeClaimCell";

export function PoolRow({
  index,
  pool,
  onOpenLiquidity,
}: {
  index: number;
  pool: PoolItem;
  onOpenLiquidity: (a: Address, b: Address) => void;
}) {
  return (
    <tr>
      <IndexCell index={index} />
      <PoolCell
        token0={pool.token0}
        token1={pool.token1}
        pair={pool.pair}
        onOpenLiquidity={() =>
          onOpenLiquidity(pool.token0.address, pool.token1.address)
        }
      />
      <TvlCell value={pool.tvlNative} />
      <Volume1DCell value={pool.vol1dNative} />
      <PoolAprCell value={pool.poolAprPct} />
      <EpochAprCell value={pool.epochAprPct} />
      <RewardCell
        rewardToken={pool.rewardToken}
        earned={pool.earned}
      />
      <StakeClaimCell pool={pool} />
    </tr>
  );
}
