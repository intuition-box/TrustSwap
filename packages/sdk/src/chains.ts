// packages/sdk/src/chain.ts
import { defineChain } from "viem";

export const intuitionTestnet = defineChain({
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


export const intuitionMainnet = defineChain({
  id: 99999, // TODO: replace with real mainnet chain id
  name: "Intuition Mainnet",
  network: "intuition-mainnet",
  nativeCurrency: {
    name: "Trust",
    symbol: "TRUST",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.intuition.systems/http"], // TODO: mainnet RPC
    },
    public: {
      http: ["https://rpc.intuition.systems/http"],
    },
  },
  blockExplorers: {
    default: {
      name: "Intuition Mainnet Explorer",
      url: "https://explorer.intuition.systems", // TODO: mainnet explorer
    },
  },
})