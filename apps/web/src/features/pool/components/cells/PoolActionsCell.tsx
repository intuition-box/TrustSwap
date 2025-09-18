import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { EpochAprCellContent } from "../cells/EpochAprCell";
import { RewardCellContent } from "../cells/RewardCell";
import { StakeClaimCellContent } from "../cells/StakeClaimCell";
import type { PoolItem } from "../../types";
import { useStakeActions } from "../../hooks/useStakeActions";
import styles from "../../tableau.module.css";

function isPositive(v: unknown): boolean {
  if (typeof v === "bigint") return v > 0n;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }
  return false;
}

export function PoolActionsCell({
  pool,
  loading,
}: {
  pool: PoolItem;
  loading?: boolean;
}) {
  const { isConnected } = useAccount();
  const staking: any = pool?.staking;
  const { claim } = useStakeActions(staking || undefined);
  const [showPopup, setShowPopup] = useState(false);
  const [showClaimTip, setShowClaimTip] = useState(false);

  // Keep farm status logic
  const isExpired = useMemo(() => {
    if (!staking) return false;

    const now = Math.floor(Date.now() / 1000);
    const end =
      staking?.end ??
      staking?.endTime ??
      staking?.period?.end ??
      staking?.endsAt ??
      staking?.finishAt;

    // Expired only if end time is in the past or explicit inactive flags are set
    if (typeof end === "number" && end > 0 && end <= now) return true;
    if (staking?.active === false || staking?.isActive === false || staking?.enabled === false) return true;

    // Do NOT infer expiration from APR being 0/undefined
    return false;
  }, [staking]);

  const hasRewards = useMemo(() => {
    return (
      isPositive(pool?.earned) ||
      isPositive(staking?.earned) ||
      isPositive(staking?.pendingRewards)
    );
  }, [pool?.earned, staking?.earned, staking?.pendingRewards]);

  const hasStaked = useMemo(() => {
    return (
      isPositive((pool as any)?.userStaked) ||
      isPositive(staking?.userStaked) ||
      isPositive(staking?.userStake) ||
      isPositive(staking?.stakedBalance) ||
      isPositive(staking?.userBalance)
    );
  }, [pool, staking]);

  // IMPORTANT: show the full cell if a farm exists, even without user state
  const showCell = Boolean(staking) || hasRewards || hasStaked;

  // If there is truly nothing to show, keep the dash
  if (!showCell) {
    return (
      <td className={styles.tdStake}>
        <span className={styles.placeholderDash ?? ""}>—</span>
      </td>
    );
  }

  return (
    <td
      className={styles.tdStake}
      onClick={(e) => {
        // Prevent row onClick when interacting inside the cell
        e.stopPropagation();
      }}
    >
      <div className={styles.containerStakeTD}>
        {/* Always show APR/status if a farm exists */}
        <EpochAprCellContent value={pool.poolAprPct ?? pool.epochAprPct} loading={loading} expired={isExpired} />

        {loading ? (
          <div className={styles.skeletonLine}></div>
        ) : (
          <div
            className={styles.claimWrapper}
            onMouseEnter={() => setShowClaimTip(true)}
            onMouseLeave={() => setShowClaimTip(false)}
            onFocus={() => setShowClaimTip(true)}
            onBlur={() => setShowClaimTip(false)}
          >
            <button
              className={styles.btnClaim}
              onClick={(e) => {
                e.stopPropagation();
                claim?.();
              }}
              // Disable actions when disconnected or when no staking ref
              disabled={!isConnected || !staking}
              aria-describedby="claim-tooltip"
              aria-expanded={showClaimTip}
            >
              Claim
            </button>

            <div
              id="claim-tooltip"
              role="tooltip"
              className={`${styles.claimTooltip} ${showClaimTip ? styles.visible : ""}`}
            >
              <div className={styles.claimHint}>Reward</div>
              <RewardCellContent
                rewardToken={pool.rewardToken}
                earned={pool.earned}
                loading={loading}
              />
            </div>
          </div>
        )}

        <div className={styles.dropdownWrapperStake}>
          <button
            className={styles.btnFarm}
            onClick={(e) => {
              e.stopPropagation();
              setShowPopup(true);
            }}
            // Disable when disconnected; UI stays identical
            disabled={!isConnected || !staking}
          >
            Farm
          </button>

          {showPopup && (
            <>
              <div className={styles.overlay} onClick={() => setShowPopup(false)} />
              <div className={styles.dropdownPopup} onClick={(e) => e.stopPropagation()}>
                <StakeClaimCellContent pool={pool} loading={loading} />

                <div className={styles.ligne}></div>
                <div className={styles.bottomStake}>
                  <RewardCellContent
                    rewardToken={pool.rewardToken}
                    earned={pool.earned}
                    loading={loading}
                  />
                  <button
                    className={styles.btnClaimPopUp}
                    onClick={(e) => {
                      e.stopPropagation();
                      claim?.();
                    }}
                    disabled={!isConnected || !staking}
                  >
                    Claim
                  </button>
                </div>
                <button
                  className={styles.btnCloseStake}
                  onClick={() => setShowPopup(false)}
                >
                  x
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </td>
  );
}
