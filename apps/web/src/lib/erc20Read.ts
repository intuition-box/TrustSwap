// lib/erc20Read.ts
import type { Address } from "viem";
import { NATIVE_PLACEHOLDER, WNATIVE_ADDRESS } from "./tokens"; // ajuste le chemin

export function toERC20ForRead(addr?: Address): Address | undefined {
  if (!addr) return undefined;
  return addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase()
    ? (WNATIVE_ADDRESS as Address)
    : addr;
}

export function isZeroAddress(addr: Address) {
  return addr === "0x0000000000000000000000000000000000000000";
}
