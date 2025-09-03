export const INTUITION = {
  id: 13579,
  name: "Intuition Testnet",
  nativeCurrency: { name: "tTRUST", symbol: "tTRUST", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.rpc.intuition.systems/http"] } }
} as const;

export type ChainDef = typeof INTUITION;
