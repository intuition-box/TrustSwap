import type { Address } from "viem";
import { addresses } from "@trustswap/sdk";

export type TokenInfo = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
};

// Tokenlist minimale pilotée par le SDK
export const TOKENLIST: TokenInfo[] = [
  {
    address: addresses.WTTRUST as Address,
    symbol: "WTTRUST",
    name: "Wrapped TRUST",
    decimals: 18,
  },
  {
    address: addresses.TSWP as Address,
    symbol: "TSWP",
    name: "TrustSwap",
    decimals: 18,
  },
];

export function getTokenByAddress(addr: string): TokenInfo {
  const t = TOKENLIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
  if (!t) throw new Error("Token not in tokenlist");
  return t;
}

export function getDefaultPair() {
  const [a, b] = TOKENLIST;
  return { tokenIn: a, tokenOut: b };
}
