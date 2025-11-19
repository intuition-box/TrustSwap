import { useMemo } from "react";
import { useChainId } from "wagmi";
import type { Chain } from "viem";
import { intuitionTestnet, intuitionMainnet } from "@trustswap/sdk";
import { getAddresses } from "@trustswap/sdk";
import { createTokenModule } from "../lib/tokens"; // adapte le chemin si besoin

const CHAINS_BY_ID: Record<number, Chain> = {
  [intuitionTestnet.id]: intuitionTestnet as unknown as Chain,
  [intuitionMainnet.id]: intuitionMainnet as unknown as Chain,
};

export function useTokenModule() {
  const chainId = useChainId() ?? intuitionTestnet.id;

  const chain = CHAINS_BY_ID[chainId] ?? CHAINS_BY_ID[intuitionTestnet.id];
  const addrBook = getAddresses(chainId);

  return useMemo(
    () => createTokenModule(chain, addrBook),
    [chain, addrBook],
  );
}
