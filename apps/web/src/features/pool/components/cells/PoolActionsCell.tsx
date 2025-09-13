import { useState } from "react";
import { EpochAprCellContent } from "../cells/EpochAprCell";
import { RewardCellContent } from "../cells/RewardCell";
import { StakeClaimCellContent } from "../cells/StakeClaimCell";
import type { PoolItem } from "../../types";
import { useStakeActions } from "../../hooks/useStakeActions";
import styles from "../../tableau.module.css";

export function PoolActionsCell({
  pool,
  loading,
}: {
  pool: PoolItem;
  loading?: boolean;
}) {
  const { claim } = useStakeActions(pool.staking || undefined);
  const [showPopup, setShowPopup] = useState(false);

  return (
    <td className={styles.tdStake}>
      <div className={styles.containerStakeTD}>
        <EpochAprCellContent value={pool.epochAprPct} loading={loading} />

      <div className={styles.rewardContainer}>
      <RewardCellContent
          rewardToken={pool.rewardToken}
          earned={pool.earned}
          loading={loading}
        />
      </div>

        {loading ? (
          <div className={styles.skeletonLine}></div>
        ) : (
          <button
            className={styles.btnClaim}
            onClick={(e) => {
              e.stopPropagation();
              claim?.();
            }}
            disabled={!pool.staking}
          >
            Claim
          </button>
        )}

        <div className={styles.dropdownWrapperStake}>
          <button
            className={styles.btnFarm}
            onClick={(e) => {
              e.stopPropagation();
              setShowPopup(true);
            }}
          >
            Farm
          </button>

          {showPopup && (
            <>
              <div
                className={styles.overlay}
                onClick={() => setShowPopup(false)}
              />
              <div
                className={styles.dropdownPopup}
                onClick={(e) => e.stopPropagation()}
              >
                <StakeClaimCellContent pool={pool} loading={loading} />

                <RewardCellContent
                  rewardToken={pool.rewardToken}
                  earned={pool.earned}
                  loading={loading}
                />

                <button
                  className={styles.btnGhost}
                  onClick={(e) => {
                    e.stopPropagation();
                    claim?.();
                  }}
                  disabled={!pool.staking}
                >
                  Claim
                </button>

                <button
                  className={styles.btnGhost}
                  onClick={() => setShowPopup(false)}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </td>
  );
}
