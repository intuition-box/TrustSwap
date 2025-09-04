import type { Address } from "viem";
import { erc20Abi } from "viem";
import { usePublicClient } from "wagmi";

export function useAllowance() {
  const pc = usePublicClient();
  return async function allowance(owner: Address, token: Address, spender: Address) {
    return pc.readContract({
      address: token, abi: erc20Abi, functionName: "allowance", args: [owner, spender],
    }) as Promise<bigint>;
  };
}
