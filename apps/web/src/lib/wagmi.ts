import { createConfig, http } from "wagmi"
import type { Chain } from "viem"
import { INTUITION } from "@trustswap/sdk" 

const MULTICALL3 = import.meta.env.VITE_MULTICALL3 as `0x${string}` | undefined

const BASE = INTUITION as unknown as Chain
const INTUITION_CHAIN: Chain = {
  ...BASE,
  contracts: {
    ...(BASE.contracts ?? {}),
    ...(MULTICALL3 ? { multicall3: { address: MULTICALL3, blockCreated: 0 } } : {}),
  },
}

export const wagmiConfig = createConfig({
  chains: [INTUITION_CHAIN],
  multiInjectedProviderDiscovery: false,
  transports: {
    [INTUITION_CHAIN.id]: http(INTUITION_CHAIN.rpcUrls.default.http[0]),
  },
})
