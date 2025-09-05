import type { Address } from "viem";
import { INTUITION, addresses } from "@trustswap/sdk";

export const NATIVE_PLACEHOLDER = addresses.NATIVE_PLACEHOLDER as Address;
export const WNATIVE_ADDRESS   = addresses.WTTRUST as Address;

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
    symbol: INTUITION?.nativeCurrency?.symbol ?? "tTRUST",
    name:   INTUITION?.nativeCurrency?.name   ?? "Native TRUST",
    decimals: 18,
    isNative: true,
  },
  {
    address: addresses.TSWP as Address,
    symbol: "TSWP",
    name: "TrustSwap",
    decimals: 18,
  },
  // ajoute ici d'autres tokens…
];

export const isNative = (addr?: string) =>
  !!addr && addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

export const toWrapped = (addr: Address): Address =>
  isNative(addr) ? WNATIVE_ADDRESS : addr;

export const buildPath = (path: Address[]): Address[] =>
  path.map(toWrapped) as Address[];

export function getTokenByAddress(addr: string): TokenInfo {
  const t = TOKENLIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
  if (!t) throw new Error(`Token not in tokenlist: ${addr}`);
  return t;
}

export function getDefaultPair(): { tokenIn: TokenInfo; tokenOut: TokenInfo } {
  const native = TOKENLIST.find(t => t.isNative) ?? TOKENLIST[0];
  const other  = TOKENLIST.find(t => t.address !== native.address) ?? native;
  return { tokenIn: native, tokenOut: other };
}
