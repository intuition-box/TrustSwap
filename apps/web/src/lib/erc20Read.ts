// src/lib/useErc20Read.ts
import type { Address } from "viem";
import { useTokenModule } from "../hooks/useTokenModule";

export function useErc20Read() {
  const { NATIVE_PLACEHOLDER, WNATIVE_ADDRESS } = useTokenModule();

  function toERC20ForRead(addr?: Address): Address | undefined {
    if (!addr) return undefined;
    return addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase()
      ? (WNATIVE_ADDRESS as Address)
      : addr;
  }

  function isZeroAddress(addr: Address) {
    return addr === "0x0000000000000000000000000000000000000000";
  }

  return { toERC20ForRead, isZeroAddress };
}
