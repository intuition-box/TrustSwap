// StakeClaimCell.tsx
import { useState } from "react";
import type { PoolItem } from "../../types";
import { useStakeActions } from "../../hooks/useStakeActions";
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

  if (loading) {
    return <div className={styles.skeletonLine}></div>;
  }

  return (
    <div className={styles.stakeCell}>
      <div className={styles.stakeRow}>
        <span className={styles.labelStakePopup}>Stake LP</span>
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
            setStakeAmt(""); // reset input après action
          }}
          disabled={!pool.staking}
        >
          Stake
        </button>
        </div>
      </div>
      <div className={styles.ligne}></div>
      {/* Input + bouton pour le unstake */}
      <div className={styles.stakeRow}>
      <span className={styles.labelStakePopup}>Unstake LP</span>
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
            setUnstakeAmt(""); // reset input après action
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
