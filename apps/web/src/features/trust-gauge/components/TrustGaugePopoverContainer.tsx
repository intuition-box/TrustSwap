// apps/web/src/features/trust-gauge/components/TrustGaugePopoverContainer.jsx
import React, { useCallback, useState } from "react";
import { TrustGaugePopover } from "./TrustGaugePopover";
import { useCreateTokenAtom } from "../hooks/useCreateTokenAtom";
import { useCreateListingTriple } from "../hooks/useCreateListingTriple";
import { useAtomByToken } from "../hooks/useAtomByToken";
import { CHAIN_ID } from "../config";

interface TrustGaugePopoverContainerProps {
  tokenAddress: string;
  className?: string;
  icon?: React.ReactNode;
  onVote?: () => void;
}

export function TrustGaugePopoverContainer({
  tokenAddress,
  className,
  icon,
  onVote,
}: TrustGaugePopoverContainerProps) {
  const { createTokenAtom } = useCreateTokenAtom();
  const { createListingTriple } = useCreateListingTriple();

  const chainId = CHAIN_ID;
  const { data: subjectId, refetch: refetchAtom } = useAtomByToken({ chainId, tokenAddress });

  const [busy, setBusy] = useState(false);

  const onCreateSignal = useCallback(
    async ({ intent = "atom" }) => {
      if (busy) return;
      setBusy(true);
      try {
        if (intent === "atom") {
          await createTokenAtom({ tokenAddress });
          await refetchAtom?.();
          return;
        }
        if (intent === "listing") {
          if (!subjectId) throw new Error("No subjectId found. Create atom first.");
          await createListingTriple({ subjectId });
          // Listing hook will refetch inside the popover; ensure atom stays fresh too
          await refetchAtom?.();
          return;
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, createTokenAtom, createListingTriple, subjectId, refetchAtom, tokenAddress]
  );

  return (
    <TrustGaugePopover
      chainId={chainId}
      tokenAddress={tokenAddress}
      className={className}
      icon={icon}
      onCreateSignal={onCreateSignal}
      onVote={onVote}
    />
  );
}
