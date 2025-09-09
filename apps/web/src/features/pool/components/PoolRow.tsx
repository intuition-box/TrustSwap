import React from "react";
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
import styles from "../tableau.module.css";

export default React.memo(PoolRow, (prev, next) => {
  const a = prev.pool, b = next.pool;
  return (
    a.pair === b.pair &&
    a.tvlNative === b.tvlNative &&
    a.vol1dNative === b.vol1dNative &&
    a.poolAprPct === b.poolAprPct &&
    prev.index === next.index
  );
});

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
    <tr
    className={styles.ligneTableau}
    onClick={() =>
      onOpenLiquidity(pool.token0.address, pool.token1.address)
    }
  >
    <IndexCell index={index} />
    <PoolCell
      token0={pool.token0}
      token1={pool.token1}
      pair={pool.pair}
    />
    <TvlCell value={pool.tvlNative} />
    <Volume1DCell value={pool.vol1dNative} />
    <PoolAprCell value={pool.poolAprPct} />
    <EpochAprCell value={pool.epochAprPct} />
    <RewardCell rewardToken={pool.rewardToken} earned={pool.earned} />
    <StakeClaimCell pool={pool} />
  </tr>
  
  );
}
