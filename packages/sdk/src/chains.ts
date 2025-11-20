// packages/sdk/src/chain.ts
import { defineChain } from "viem";

export const intuitionTestnet = defineChain({
  id: 13579,
  name: "Testnet",
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
  id: 1155,
  name: "Mainnet",
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
  contracts: {
    multicall3: {
      address: "0x31E7C4ef16e1c3c149D2F0a62517d621bDa6D037",
      blockCreated: 117543
    }
  }
})