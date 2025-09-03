import type { Address } from "viem";
import { parseUnits } from "viem";
import { useWalletClient } from "wagmi";
import { getTokenByAddress } from "../../../lib/tokens";
import { abi, addresses } from "@trustswap/sdk";

export function useSwap() {
  const { data: wallet } = useWalletClient();

  return async function swapExactTokensForTokens(
    owner: Address,
    tokenIn: Address,
    tokenOut: Address,
    amountInStr: string,
    minOut: bigint,
    deadlineSec: number
  ) {
    if (!wallet) throw new Error("Wallet not connected");

    const tIn = getTokenByAddress(tokenIn);
    const amtIn = parseUnits(amountInStr || "0", tIn.decimals);

    return wallet.writeContract({
      address: addresses.UniswapV2Router02 as Address,
      abi: abi.UniswapV2Router02,
      functionName: "swapExactTokensForTokens",
      args: [amtIn, minOut, [tokenIn, tokenOut], owner, BigInt(deadlineSec)],
    });
  };
}
