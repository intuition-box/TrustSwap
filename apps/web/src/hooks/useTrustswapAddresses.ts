// src/hooks/useTrustswapAddresses.ts
import { useChainId } from "wagmi";
import { getAddresses } from "@trustswap/sdk";

const FALLBACK_CHAIN_ID = 13579;

export function useTrustswapAddresses() {
  const chainId = useChainId() || FALLBACK_CHAIN_ID;
  return getAddresses(chainId);
}
