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

  const hasAtom = !!subjectId;

  const {
    data: listing,
    isLoading: isListingLoadingRaw,
    refetch: refetchListing,
  } = useTrustedListing({ subjectId, enabled: hasAtom, debug: true });

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

  const votesForLabel = useMemo(() => {
    const v = listing?.forShares ?? 0n;
    return Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, [listing]);

  const votesAgainstLabel = useMemo(() => {
    const v = listing?.againstShares ?? 0n;
    return Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, [listing]);

  const isLoading = isAtomLoading || isListingLoading;

  // Local input state for tTRUST amount (human units, e.g., "0.01")
  const [amountStr, setAmountStr] = useState("");

  function parseAmountToWeiSafe(v) {
    try {
      const trimmed = String(v || "").trim();
      if (!trimmed) return 0n;
      return parseEther(trimmed); // assumes 18 decimals
    } catch {
      return 0n;
    }
  }

  async function handleCreateSignal(intent) {
    if (!onCreateSignal) return;
    await onCreateSignal({ chainId, tokenAddress, intent });
    await refetchAtom?.();
    await refetchListing?.();
  }

  async function doDepositExact(side) {
    if (!onDepositExact) return;
    const termId = side === "for" ? listing?.tripleId : listing?.counterTripleId;
    if (!termId) return;
    const wei = parseAmountToWeiSafe(amountStr);
    if (wei <= 0n) {
      // simple UX guard; replace with your toast system if available
      console.warn("Enter a positive amount in tTRUST.");
      return;
    }
    await onDepositExact({ chainId, termId: String(termId), side, amountWei: wei });
    await refetchListing?.();
  }

  async function doDepositMin(side) {
    if (!onDepositMin) return;
    const termId = side === "for" ? listing?.tripleId : listing?.counterTripleId;
    if (!termId) return;
    await onDepositMin({ chainId, termId: String(termId), side });
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
        ) : !listing?.tripleId ? (
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
            <div className={styles.popoverTitle}>Listing votes</div>
            <div className={styles.popoverText}>
              <strong>FOR:</strong> {votesForLabel} tTRUST&nbsp;&nbsp;|&nbsp;&nbsp;
              <strong>AGAINST:</strong> {votesAgainstLabel} tTRUST
            </div>

            {/* Amount input */}
            <div className={styles.popoverRow} style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Amount in tTRUST (e.g., 0.01)"
                className={styles.input}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Action buttons */}
            <div className={styles.popoverRow} style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className={styles.successBtn}
                disabled={isLoading || isBusy || !listing?.tripleId}
                onClick={(e) => {
                  e.stopPropagation();
                  doDepositExact("for");
                }}
              >
                Vote FOR (amount)
              </button>
              <button
                className={styles.secondaryBtn}
                disabled={isLoading || isBusy || !listing?.tripleId}
                onClick={(e) => {
                  e.stopPropagation();
                  doDepositMin("for");
                }}
              >
                Min FOR
              </button>

              <button
                className={styles.dangerBtn}
                disabled={isLoading || isBusy || !listing?.counterTripleId}
                onClick={(e) => {
                  e.stopPropagation();
                  doDepositExact("against");
                }}
              >
                Vote AGAINST (amount)
              </button>
              <button
                className={styles.secondaryBtn}
                disabled={isLoading || isBusy || !listing?.counterTripleId}
                onClick={(e) => {
                  e.stopPropagation();
                  doDepositMin("against");
                }}
              >
                Min AGAINST
              </button>
            </div>

            {!!lastError && (
              <div className={styles.popoverText} style={{ marginTop: 8, color: "var(--danger)" }}>
                {lastError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
