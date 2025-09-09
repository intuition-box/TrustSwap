import { createConfig, http } from "wagmi";
import { INTUITION } from "@trustswap/sdk";

export const wagmiConfig = createConfig({
  chains: [INTUITION],
  multiInjectedProviderDiscovery: false,
  transports: {
    [INTUITION.id]: http(
      INTUITION.rpcUrls.default.http[0],
      { batch: true } 
    ),
  },
  batch: { multicall: { wait: 32, batchSize: 1024 } },
});
