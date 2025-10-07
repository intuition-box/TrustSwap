// apps/web/src/features/trust-gauge/components/TrustGaugePopover.jsx
// English-only comments
import React, { useMemo, useState } from "react";
import { TrustGaugeRing } from "./TrustGaugeRing";
import styles from "../TrustGaugePopover.module.css";
import { useAtomByToken } from "../hooks/useAtomByToken";
import { useTrustedListing } from "../hooks/useTrustedListing";
import { formatEther, parseEther } from "viem";

type TrustGaugePopoverProps = {
  chainId: number;
  tokenAddress: string;
  className?: string;
  icon?: React.ReactNode;
  onCreateSignal?: (params: { chainId: number; tokenAddress: string; intent: string }) => Promise<void>;
  onDepositExact?: (params: { chainId: number; termId: string; side: string; amountWei: bigint }) => Promise<void>;
  onDepositMin?: (params: { chainId: number; termId: string; side: string }) => Promise<void>;
  isBusy?: boolean;
  lastError?: string;
};

export function TrustGaugePopover({
  chainId,
  tokenAddress,
  className,
  icon,
  onCreateSignal,
  onDepositExact,
  onDepositMin,
  isBusy,
  lastError,
}: TrustGaugePopoverProps) {
  const { data: subjectId, isLoading: isAtomLoading, refetch: refetchAtom } = useAtomByToken({
    chainId,
    tokenAddress,
  });

  const subjectIdRaw =
    subjectId && typeof subjectId === "object" && "vaultId" in subjectId ? subjectId.vaultId : subjectId;

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

  const {
    data: listing,
    isLoading: isListingLoadingRaw,
    refetch: refetchListing,
  } = useTrustedListing({ subjectId, enabled: hasAtom, debug: true });

  const isListingLoading = hasAtom && isListingLoadingRaw;
  const loading = Boolean(isAtomLoading || isListingLoading || isBusy);

  const ratioFor = useMemo(() => {
    const forShares = listing?.forShares || 0n;
    const againstShares = listing?.againstShares || 0n;
    const total = forShares + againstShares;
    if (total === 0n) return 0;
    const million = 1000000n;
    const scaled = (forShares * million) / total;
    return Number(scaled) / 1000000;
  }, [listing]);


  // Voter counts come directly from useTrustedListing now
  const forVoters = listing?.voteFor ?? 0;
  const againstVoters = listing?.voteAgainst ?? 0;

  // Local amount input
  const [amountStr, setAmountStr] = useState("");

  function parseAmountToWeiSafe(v: any) {
    try {
      const trimmed = String(v || "").trim();
      if (!trimmed) return 0n;
      return parseEther(trimmed);
    } catch {
      return 0n;
    }
  }

  async function handleCreateSignal(intent: string) {
    if (!onCreateSignal) return;
    await onCreateSignal({ chainId, tokenAddress, intent });
    await refetchAtom?.();
    await refetchListing?.();
  }

  async function doDepositExact(side: "for" | "against") {
    if (!onDepositExact) return;
    const termId = side === "for" ? listing?.tripleId : listing?.counterTripleId;
    if (!termId) return;
    const wei = parseAmountToWeiSafe(amountStr);
    if (wei <= 0n) {
      console.warn("Enter a positive amount in tTRUST.");
      return;
    }
    await onDepositExact({ chainId, termId: String(termId), side, amountWei: wei });
    await refetchListing?.();
  }

  async function doDepositMin(side: "for" | "against") {
    if (!onDepositMin) return;
    const termId = side === "for" ? listing?.tripleId : listing?.counterTripleId;
    if (!termId) return;
    await onDepositMin({ chainId, termId: String(termId), side });
    await refetchListing?.();
  }

  const votersLabel = (n?: number) => `${n ?? 0} ${n === 1 ? "voter" : "voters"}`;

// English-only comments
  return (
    <div className={`${styles.wrap} ${className || ""}`}>
      <div className={styles.trigger}>
        <div className={styles.ringBox} style={{ width: 28, height: 28 }}>
          <div className={styles.trigger}>
            <TrustGaugeRing
              forCount={listing?.voteFor ?? 0}
              againstCount={listing?.voteAgainst ?? 0}
              size={48}
              ratioFor={ratioFor}
              thickness={3}
              icon={icon} // or icon={({ size }) => <YourIcon width={size} height={size} />}
            />
          </div>
        </div>
      </div>

      <div
        className={styles.popover}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        data-stop-row-select
      >
        {!hasAtom ? (
          <div className={`${styles.popoverCard} ${styles.popoverSection}`}>
            <div className={styles.popoverHeader}>
              <div className={styles.popoverKicker}>Status</div>
              <div className={styles.popoverTitle}>Not verified</div>
              <div className={styles.popoverText}>No atom found for this token.</div>
            </div>

            <div className={styles.divider} />

            <div className={styles.btnRow}>
              <button
                className={`${styles.btn} ${styles.primaryBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateSignal("atom");
                }}
              >
                Create signal
              </button>
            </div>
          </div>
        ) : !listing?.tripleId ? (
          <div className={`${styles.popoverCard} ${styles.popoverSection}`}>
            <div className={styles.popoverHeader}>
              <div className={styles.popoverKicker}>Status</div>
              <div className={styles.popoverTitle}>Not listed on TrustSwap</div>
              <div className={styles.popoverText}>Create the listing triple to enable voting.</div>
            </div>

            <div className={styles.divider} />

            <div className={styles.btnRow}>
              <button
                className={`${styles.btn} ${styles.primaryBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateSignal("listing");
                }}
              >
                Create listing
              </button>
            </div>
          </div>
        ) : (
          <div className={`${styles.popoverCard} ${styles.popoverSection}`}>
            <div className={styles.popoverHeader}>
              <div className={styles.popoverTitle}>Listing votes</div>
            </div>

            <div className={styles.statRow}>
              <div className={`${styles.statPill} ${styles.statFor}`}>
                <span className={styles.statLabel}>FOR</span>
                <span className={styles.statValue}>{votersLabel(forVoters)}</span>
              </div>
              <div className={`${styles.statPill} ${styles.statAgainst}`}>
                <span className={styles.statLabel}>AGAINST</span>
                <span className={styles.statValue}>{votersLabel(againstVoters)}</span>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.inputRow}>
              <span className={styles.inputPrefix}>tTRUST</span>
              <input
                type="text"
                placeholder="Amount"
                className={styles.inputControl}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className={styles.btnGrid}>
              <button
                className={`${styles.btn} ${styles.successBtn}`}
                disabled={loading || !listing?.tripleId}
                onClick={(e) => {
                  e.stopPropagation();
                  doDepositExact("for");
                }}
              >
                Vote FOR (amount)
              </button>
              <button
                className={`${styles.btn} ${styles.secondaryBtn}`}
                disabled={loading || !listing?.tripleId}
                onClick={(e) => {
                  e.stopPropagation();
                  doDepositMin("for");
                }}
              >
                Min FOR
              </button>

              <button
                className={`${styles.btn} ${styles.dangerBtn}`}
                disabled={loading || !listing?.counterTripleId}
                onClick={(e) => {
                  e.stopPropagation();
                  doDepositExact("against");
                }}
              >
                Vote AGAINST (amount)
              </button>
              <button
                className={`${styles.btn} ${styles.secondaryBtn}`}
                disabled={loading || !listing?.counterTripleId}
                onClick={(e) => {
                  e.stopPropagation();
                  doDepositMin("against");
                }}
              >
                Min AGAINST
              </button>
            </div>

            {!!lastError && (
              <div className={`${styles.popoverText} ${styles.errorText}`}>
                {lastError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

}
