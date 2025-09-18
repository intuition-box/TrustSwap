// features/pools/components/StakeClaimCell.tsx
import { useState } from "react";
import type { PoolItem } from "../../types";
import { useStakeActions } from "../../hooks/useStakeActions";
import { useLpPosition } from "../../hooks/useLpPosition";
import { useStakedBalance } from "../../hooks/useStakedBalance";
import { formatUnits } from "viem";
import styles from "../../pools.module.css";

export function StakeClaimCellContent({
  pool,
  loading = false,
}: {
  pool: PoolItem;
  loading?: boolean;
}) {
  const [stakeAmt, setStakeAmt] = useState("");
  const [unstakeAmt, setUnstakeAmt] = useState("");
  const { stake, withdraw } = useStakeActions(pool.staking || undefined);

  // Infos LP (wallet + share + pooled tokens)
  const lpPos = useLpPosition(pool.tokenA, pool.tokenB);

  // LP stakés
  const stakedBalance = useStakedBalance(pool.staking);

  if (loading) {
    return <div className={styles.skeletonLine}></div>;
  }

  const walletLp =
    lpPos.lpBalance !== undefined
      ? Number(formatUnits(lpPos.lpBalance, 18)).toFixed(6)
      : "0.000000";

  const stakedLp =
    stakedBalance !== null
      ? Number(formatUnits(stakedBalance, 18)).toFixed(6)
      : "0.000000";

  return (
    <div className={styles.stakeCell}>
      {/* Stake */}
      <div className={styles.stakeRow}>
        <span className={styles.labelStakePopup}>
          Stake LP
          <div
            className={styles.lpStake}
            onClick={(e) => {
              e.stopPropagation();
              setStakeAmt(walletLp); // remplir input
            }}
            style={{ cursor: "pointer" }}
            title="Click to use full balance"
          >
            Balance: {walletLp}
          </div>
        </span>
        <div className={styles.containerStake}>
          <input
            className={styles.amountInputStake}
            value={stakeAmt}
            onChange={(e) => setStakeAmt(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Amount to Stake"
          />
          <button
            className={styles.btnAction}
            onClick={(e) => {
              e.stopPropagation();
              stake?.(parseUnitsSafe(stakeAmt));
              setStakeAmt("");
            }}
            disabled={!pool.staking}
          >
            Stake
          </button>
        </div>
      </div>

      <div className={styles.ligne}></div>

      {/* Unstake */}
      <div className={styles.stakeRow}>
        <span className={styles.labelStakePopup}>
          Unstake LP
          <div
            className={styles.lpStake}
            onClick={(e) => {
              e.stopPropagation();
              setUnstakeAmt(stakedLp); // remplir input
            }}
            style={{ cursor: "pointer" }}
            title="Click to use full balance"
          >
            Balance: {stakedLp}
          </div>
        </span>
        <div className={styles.containerUnstake}>
          <input
            className={styles.amountInputUnstake}
            value={unstakeAmt}
            onChange={(e) => setUnstakeAmt(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Amount to Unstake"
          />
          <button
            className={styles.btnAction}
            onClick={(e) => {
              e.stopPropagation();
              withdraw?.(parseUnitsSafe(unstakeAmt));
              setUnstakeAmt("");
            }}
            disabled={!pool.staking}
          >
            Unstake
          </button>
        </div>
      </div>
    </div>
  );
}

export function StakeClaimCell(props: { pool: PoolItem; loading?: boolean }) {
  return (
    <td>
      <StakeClaimCellContent {...props} />
    </td>
  );
}

function parseUnitsSafe(v: string): bigint {
  try {
    return BigInt(Math.floor(Number(v) * 1e18));
  } catch {
    return 0n;
  }
}
