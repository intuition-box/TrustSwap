// apps/web/src/features/trust-gauge/components/TrustGaugePopoverContainer.jsx
// English-only comments
import React, { useCallback, useState } from "react";
import { TrustGaugePopover } from "./TrustGaugePopover";
import { useCreateTokenAtom } from "../hooks/useCreateTokenAtom";
import { useCreateListingTriple } from "../hooks/useCreateListingTriple";
import { useAtomByToken } from "../hooks/useAtomByToken";
import { useDepositToVault } from "../hooks/useDepositToVault";
import { CHAIN_ID } from "../config";

interface TrustGaugePopoverContainerProps {
  tokenAddress: string;
  className?: string;
  icon?: React.ReactNode;
}

export function TrustGaugePopoverContainer({ tokenAddress, className, icon }: TrustGaugePopoverContainerProps) {
  const { createTokenAtom } = useCreateTokenAtom();
  const { createListingTriple } = useCreateListingTriple();
  const {
    depositExact,
    depositMin,
    loading: voteLoading,
    findingMin,
    error,
  } = useDepositToVault({ chainId: CHAIN_ID });

  const chainId = CHAIN_ID;
  const { data: subjectId, refetch: refetchAtom } = useAtomByToken({ chainId, tokenAddress });

  const [busy, setBusy] = useState(false);

  const onCreateSignal = useCallback(
    async ({ intent = "atom" }) => {
      if (busy) return;
      setBusy(true);
      try {
        if (intent === "atom") {
          await createTokenAtom({ tokenAddress: tokenAddress as `0x${string}` });
          await refetchAtom?.();
          return;
        }
        if (intent === "listing") {
          if (!subjectId) throw new Error("No subjectId found. Create atom first.");
          await createListingTriple({ subjectId });
          await refetchAtom?.();
          return;
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, createTokenAtom, createListingTriple, subjectId, refetchAtom, tokenAddress]
  );

  // From popover: deposit a user-entered amount (wei) to termId
  const onDepositExact = useCallback(
    async ({ termId, amountWei }: { termId: string; amountWei: string }) => {
      if (busy || voteLoading) return;
      setBusy(true);
      try {
        await depositExact({ termId, amountWei });
      } finally {
        setBusy(false);
      }
    },
    [busy, voteLoading, depositExact]
  );

  // From popover: deposit the minimum accepted amount to termId
  const onDepositMin = useCallback(
    async ({ termId }: { termId: string }) => {
      if (busy || voteLoading || findingMin) return;
      setBusy(true);
      try {
        await depositMin({ termId });
      } finally {
        setBusy(false);
      }
    },
    [busy, voteLoading, findingMin, depositMin]
  );

  return (
    <TrustGaugePopover
      chainId={chainId}
      tokenAddress={tokenAddress}
      className={className}
      icon={icon}
      onCreateSignal={onCreateSignal}
      onDepositExact={onDepositExact}
      onDepositMin={onDepositMin}
      isBusy={busy || voteLoading || findingMin}
      lastError={error ? String(error?.message || error) : null}
    />
  );
}
