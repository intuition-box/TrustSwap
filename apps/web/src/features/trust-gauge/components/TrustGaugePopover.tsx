// apps/web/src/features/trust-gauge/components/TrustGaugePopover.jsx
import React, { useMemo } from "react";
import { TrustGaugeRing } from "./TrustGaugeRing";
import styles from "../TrustGaugePopover.module.css";
import { useAtomByToken } from "../hooks/useAtomByToken";
import { useTrustedListing } from "../hooks/useTrustedListing";

/**
 * If you're using TS, update the prop type to include "intent":
 * onCreateSignal?: (params: { chainId: number; tokenAddress: string; intent?: "atom" | "listing" }) => Promise<void>;
 */

type TrustGaugePopoverProps = {
  chainId: number;
  tokenAddress: string;
  className?: string;
  icon?: React.ReactNode;
  onCreateSignal?: (params: { chainId: number; tokenAddress: string; intent?: "atom" | "listing" }) => Promise<void>;
  onVote?: (params: { chainId: number; termId: bigint; side: "for" | "against" }) => Promise<void>;
};

export function TrustGaugePopover({
  chainId,
  tokenAddress,
  className,
  icon,
  onCreateSignal,
  onVote,
}: TrustGaugePopoverProps) {
  const { data: subjectId, isLoading: isAtomLoading } = useAtomByToken({
    chainId,
    tokenAddress,
  });

  // Normalize subjectId -> bigint > 0n only
  const subjectIdRaw = subjectId && typeof subjectId === "object" && "vaultId" in subjectId
    ? subjectId.vaultId
    : subjectId;

  const subjectIdBn = useMemo(() => {
    if (subjectIdRaw === null || subjectIdRaw === undefined) return null;
    try {
      const b = typeof subjectIdRaw === "bigint" ? subjectIdRaw : BigInt(subjectIdRaw);
      return b > 0n ? b : null;
    } catch {
      return null;
    }
  }, [subjectIdRaw]);

  const hasAtom = !!subjectIdBn;

  // Gate the listing fetch behind hasAtom (requires your hook to support `enabled`)
  const {
    data: listing,
    isLoading: isListingLoadingRaw,
    refetch: refetchListing,
  } = useTrustedListing({ subjectId: subjectIdBn, enabled: hasAtom });

  const isListingLoading = hasAtom && isListingLoadingRaw;

  const ratioFor = useMemo(() => {
    const forShares = listing?.forShares || 0n;
    const againstShares = listing?.againstShares || 0n;
    const total = forShares + againstShares;
    if (total === 0n) return 0;
    const million = 1000000n;
    const scaled = (forShares * million) / total;
    return Number(scaled) / 1000000;
  }, [listing]);

  const isLoading = isAtomLoading || isListingLoading;
  const hasTriple = Boolean(listing?.tripleId);

  async function handleCreateSignal(intent) {
    if (!onCreateSignal) return;
    await onCreateSignal({ chainId, tokenAddress, intent });
    await refetchListing?.();
  }

  async function handleVote(side) {
    if (!onVote) return;
    const termId = side === "for" ? listing?.tripleId : listing?.counterTripleId;
    if (!termId) return;
    await onVote({ chainId, termId, side });
    await refetchListing?.();
  }

  return (
    <div className={`${styles.wrap} ${className || ""}`}>
      <div className={styles.trigger}>
        <div className={styles.ringBox} style={{ width: 28, height: 28 }}>
          <TrustGaugeRing ratioFor={ratioFor} size={28} />
          <div className={styles.ringIcon}>{icon || null}</div>
        </div>
      </div>

      <div
        className={styles.popover}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        data-stop-row-select
      >
        {/* Show "Not verified" until we have a real subjectId > 0n */}
        {!hasAtom ? (
          <div className={styles.popoverSection}>
            <div className={styles.popoverTitle}>Not verified</div>
            <div className={styles.popoverText}>No atom found for this token.</div>
            <button
              className={styles.primaryBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleCreateSignal("atom");
              }}
            >
              Create signal
            </button>
          </div>
        ) : !hasTriple ? (
          <div className={styles.popoverSection}>
            <div className={styles.popoverTitle}>Not listed on TrustSwap</div>
            <div className={styles.popoverText}>Create the listing triple to enable voting.</div>
            <button
              className={styles.primaryBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleCreateSignal("listing");
              }}
            >
              Create listing
            </button>
          </div>
        ) : (
          <div className={styles.popoverSection}>
            <button
              className={styles.successBtn}
              disabled={listing?.userSide === "against"}
              onClick={(e) => {
                e.stopPropagation();
                handleVote("for");
              }}
            >
              Vote FOR
            </button>
            <button
              className={styles.dangerBtn}
              disabled={listing?.userSide === "for"}
              onClick={(e) => {
                e.stopPropagation();
                handleVote("against");
              }}
            >
              Vote AGAINST
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
