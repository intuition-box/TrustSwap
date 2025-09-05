import type { Address } from "viem";
import { INTUITION, addresses } from "@trustswap/sdk";

/** Placeholder standard native */
export const NATIVE_PLACEHOLDER = addresses.NATIVE_PLACEHOLDER as Address;

export const NATIVE_SYMBOL = INTUITION?.nativeCurrency?.symbol ?? "tTRUST";
export const NATIVE_NAME = INTUITION?.nativeCurrency?.name ?? "Native TRUST";

export const WNATIVE_ADDRESS = addresses.WTTRUST as Address;

/** Helpers */
export const isNative = (addr?: Address) =>
  !!addr && addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

export const toWrapped = (addr: Address): Address =>
  isNative(addr) ? WNATIVE_ADDRESS : addr;

export const buildPath = (path: Address[]): Address[] =>
  path.map(toWrapped) as Address[];
