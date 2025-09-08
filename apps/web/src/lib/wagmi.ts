import { createConfig, http } from "wagmi"
import type { Chain } from "viem"
import { INTUITION } from "@trustswap/sdk" 


const INTUITION_CHAIN = INTUITION as unknown as Chain

export const wagmiConfig = createConfig({
  chains: [INTUITION_CHAIN],
  multiInjectedProviderDiscovery: false,
  transports: {
    [INTUITION_CHAIN.id]: http(INTUITION_CHAIN.rpcUrls.default.http[0]),
  },
})
