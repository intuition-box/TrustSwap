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
  const [amt, setAmt] = useState("");
  const { stake, withdraw } = useStakeActions(pool.staking || undefined);

  if (loading) {
    return <div className={styles.skeletonLine}></div>;
  }

  return (
    <div className={styles.stakeCell}>
      <input
        className={styles.amountInput}
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder="Amount LP"
      />
      <button
        className={styles.btn}
        onClick={(e) => {
          e.stopPropagation();
          stake?.(parseUnitsSafe(amt));
        }}
        disabled={!pool.staking}
      >
        Stake
      </button>
      <button
        className={styles.btn}
        onClick={(e) => {
          e.stopPropagation();
          withdraw?.(parseUnitsSafe(amt));
        }}
        disabled={!pool.staking}
      >
        Unstake
      </button>
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
