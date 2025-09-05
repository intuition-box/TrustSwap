import type { Address } from "viem";
import { erc20Abi, maxUint256 } from "viem";
import { usePublicClient } from "wagmi";
import { NATIVE_PLACEHOLDER } from "../../../lib/tokens";

const isNative = (a?: Address) =>
  !!a && a.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

export function useAllowance() {
  const pc = usePublicClient();

  return async function allowance(
    owner: Address,
    token: Address,
    spender: Address
  ): Promise<bigint> {
    if (!pc) throw new Error("Public client not available");

    
    if (isNative(token)) return maxUint256;

    try {
      const res = await pc.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      });
      return res as bigint;
    } catch (e) {
      return 0n;
    }
  };
}
