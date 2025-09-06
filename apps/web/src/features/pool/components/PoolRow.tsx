// apps/web/src/features/pools/components/PoolRow.tsx
import type { PoolItem } from "../types";
import { IndexCell } from "./cells/IndexCell";
import { PoolCell } from "./cells/PoolCell";
import { TvlCell } from "./cells/TvlCell";
import { Volume1DCell } from "./cells/Volume1DCell";
import { PoolAprCell } from "./cells/PoolAprCell";
import { EpochAprCell } from "./cells/EpochAprCell";
import { RewardCell } from "./cells/RewardCell";
import { StakeClaimCell } from "./cells/StakeClaimCell";


export function PoolRow({ index, pool }: { index: number; pool: PoolItem }) {
return (
<tr>
<IndexCell index={index} />
<PoolCell token0={pool.token0} token1={pool.token1} pair={pool.pair} />
<TvlCell value={pool.tvlNative} />
<Volume1DCell value={pool.vol1dNative} />
<PoolAprCell value={pool.poolAprPct} />
<EpochAprCell value={pool.epochAprPct} />
<RewardCell rewardToken={pool.rewardToken} ratePerSec={pool.rewardRatePerSec} />
<StakeClaimCell pool={pool} />
</tr>
);
}