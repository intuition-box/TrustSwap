import type { Address } from "viem";
import { addresses } from "@trustswap/sdk";

export const NATIVE_PLACEHOLDER = addresses.NATIVE_PLACEHOLDER as Address;

export type TokenInfo = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
};

export const TOKENLIST: TokenInfo[] = [
  {
    address: NATIVE_PLACEHOLDER,
    symbol: "TTRUST",
    name: "Native TRUST",
    decimals: 18,
    isNative: true,
  },
  {
    address: addresses.TSWP as Address,
    symbol: "TSWP",
    name: "TrustSwap",
    decimals: 18,
  },
];

export function getTokenByAddress(addr: string): TokenInfo {
  if (addr?.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase()) {
    return {
      address: NATIVE_PLACEHOLDER,
      symbol: "TTRUST",
      name: "Native TRUST",
      decimals: 18,
      isNative: true,
    };
  }
  const t = TOKENLIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
  if (!t) throw new Error("Token not in tokenlist");
  return t;
}

export function getDefaultPair(): { tokenIn: TokenInfo; tokenOut: TokenInfo } {
  const native = TOKENLIST.find(t => t.isNative) ?? TOKENLIST[0];
  const other = TOKENLIST.find(t => t.address !== native.address) ?? native;
  return { tokenIn: native, tokenOut: other };
}
