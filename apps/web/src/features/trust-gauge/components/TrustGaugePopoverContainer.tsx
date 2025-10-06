// apps/web/src/features/trust-gauge/components/TrustGaugePopoverContainer.jsx
import React, { useCallback, useState } from "react";
import { TrustGaugePopover } from "./TrustGaugePopover";
import { useCreateTokenAtom } from "../hooks/useCreateTokenAtom";
import { useAtomByToken } from "../hooks/useAtomByToken";
import { CHAIN_ID } from "../config"; 

type TrustGaugePopoverContainerProps = {
  tokenAddress: string;
  className?: string;
  icon?: React.ReactNode;
  onVote?: () => void;
};

export function TrustGaugePopoverContainer({
  tokenAddress,
  className,
  icon,
  onVote,
}: TrustGaugePopoverContainerProps) {
  const { createTokenAtom } = useCreateTokenAtom(); // uses config defaults (Intuition testnet)

  const chainId =  CHAIN_ID; 
  const { refetch: refetchAtom } = useAtomByToken({
    chainId,
    tokenAddress,
  });

  const [busy, setBusy] = useState(false);

  const onCreateSignal = useCallback(
    async ({ intent = "atom" }) => {
      if (busy) return;
      setBusy(true);
      try {
        if (intent !== "atom") return;
        await createTokenAtom({ tokenAddress: tokenAddress as `0x${string}` }); // no chainId passed
        await refetchAtom();
      } finally {
        setBusy(false);
      }
    },
    [busy, createTokenAtom, refetchAtom, tokenAddress]
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
