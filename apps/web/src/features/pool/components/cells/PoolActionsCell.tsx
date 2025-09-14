import { useState, useMemo } from "react";
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
  const staking: any = pool?.staking;
  const { claim } = useStakeActions(staking || undefined);
  const [showPopup, setShowPopup] = useState(false);
  const [showClaimTip, setShowClaimTip] = useState(false); 

  const isExpired = useMemo(() => {
    if (!staking) return false;
    const now = Math.floor(Date.now() / 1000);
    const end =
      staking?.end ??
      staking?.endTime ??
      staking?.period?.end ??
      staking?.endsAt ??
      staking?.finishAt;

    if (typeof end === "number" && end > 0 && end <= now) return true;
    if (staking?.active === false || staking?.isActive === false || staking?.enabled === false) return true;
    if ((pool.epochAprPct == null || pool.epochAprPct <= 0) && staking) return true;
    return false;
  }, [staking, pool.epochAprPct]);

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

  const showActions = hasRewards || hasStaked;

  // Pas de farm du tout → tiret
  if (!staking) {
    return (
      <td className={styles.tdStake}>
        <span className={styles.placeholderDash ?? ""}>—</span>
      </td>
    );
  }

  // Farm existante mais expirée ET aucun LP/reward → afficher "Expired"
  if (isExpired && !showActions) {
    return (
      <td className={styles.tdStake}>
        <span className={styles.expiredBadge}>Expired</span>
      </td>
    );
  }

  // Sinon, afficher la cellule complète (et passer expired pour le badge APR)
  return (
    <td className={styles.tdStake}>
      <div className={styles.containerStakeTD}>
        <EpochAprCellContent value={pool.epochAprPct} loading={loading} expired={isExpired} />

        {loading ? (
          <div className={styles.skeletonLine}></div>
        ) : (
          <div
            className={styles.claimWrapper}
            onMouseEnter={() => setShowClaimTip(true)}
            onMouseLeave={() => setShowClaimTip(false)}
            onFocus={() => setShowClaimTip(true)}
            onBlur={() => setShowClaimTip(false)}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.btnClaim}
              onClick={(e) => {
                e.stopPropagation();
                claim?.();
              }}
              disabled={!pool.staking}
              aria-describedby="claim-tooltip"
              aria-expanded={showClaimTip}
            >
              Claim
            </button>

            {/* Tooltip au survol */}
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
          >
            Farm
          </button>

          {showPopup && (
            <>
              <div className={styles.overlay} onClick={() => setShowPopup(false)} />
              <div className={styles.dropdownPopup} onClick={(e) => e.stopPropagation()}>
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

                <button className={styles.btnGhost} onClick={() => setShowPopup(false)}>
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