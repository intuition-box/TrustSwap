export const INTUITION = {
  id: 13579,
  name: "Intuition Testnet",
  nativeCurrency: { name: "tTRUST", symbol: "tTRUST", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.rpc.intuition.systems/http"] },
    public: { http: ["https://testnet.rpc.intuition.systems/http"] },
  },
  blockExplorers: {
    default: {
      name: "Intuition Explorer",
      url: "https://testnet.explorer.intuition.systems/",
    },
  },
} as const;

export type ChainDef = typeof INTUITION;
