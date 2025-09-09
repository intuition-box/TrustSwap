// packages/sdk/src/chain.ts
import { defineChain } from "viem";

export const INTUITION = defineChain({
  id: 13579,
  name: "Intuition Testnet",
  nativeCurrency: { name: "tTRUST", symbol: "tTRUST", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.rpc.intuition.systems/http"] },
    public:  { http: ["https://testnet.rpc.intuition.systems/http"] },
  },
  blockExplorers: {
    default: { name: "Intuition Explorer", url: "https://testnet.explorer.intuition.systems/" },
  },
  contracts: {
    multicall3: {
      address: "0x6E26ea6ab2236a28e3F2B59F532b79273e0Dc575",
      blockCreated: 4252441
    }
  }
});
