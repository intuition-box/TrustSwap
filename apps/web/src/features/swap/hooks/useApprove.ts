import type { Address } from "viem";
import { erc20Abi } from "viem";
import { useWalletClient } from "wagmi";

export function useApprove() {
  const { data: wallet } = useWalletClient();
  return async function approve(token: Address, spender: Address, amount: bigint) {
    if (!wallet) throw new Error("Wallet not connected");
    return wallet.writeContract({
      address: token, abi: erc20Abi, functionName: "approve", args: [spender, amount],
    });
  };
}
