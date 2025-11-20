import { createConfig, http } from "wagmi";
import type { Chain } from "viem";
import { intuitionTestnet, intuitionMainnet } from "@trustswap/sdk";

const MULTICALL3 = import.meta.env.VITE_MULTICALL3 as `0x${string}` | undefined;

function withMulticall(chain: Chain): Chain {
  if (!MULTICALL3) return chain;
  return {
    ...chain,
    contracts: {
      ...(chain.contracts ?? {}),
      multicall3: {
        address: MULTICALL3,
        blockCreated: 0,
      },
    },
  };
}

export const CHAINS: Chain[] = [
  withMulticall(intuitionTestnet as unknown as Chain),
  withMulticall(intuitionMainnet as unknown as Chain),
];

export const wagmiConfig = createConfig({
  chains: CHAINS,
  multiInjectedProviderDiscovery: false,
  transports: Object.fromEntries(
    CHAINS.map((chain) => [chain.id, http(chain.rpcUrls.default.http[0])]),
  ),
});
