import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { abi, addresses } from "@trustswap/sdk";
import { formatUnits } from "viem";

/**
 * Estime le coût réseau (gas) pour un swapExactTokensForTokens
 * Retourne une string "X tTRUST" (approx 18 décimales natives)
 */
export function useGasEstimate() {
  const pc = usePublicClient();

  return async function estimateNetworkFee(args: {
    account?: Address;
    amountIn: bigint;
    minOut: bigint;
    path: Address[];
    to: Address;
    deadline: bigint;
    nativeSymbol?: string; // default tTRUST
  }): Promise<string | null> {
    try {
      const gas = await pc.estimateContractGas({
        address: addresses.UniswapV2Router02 as Address,
        abi: abi.UniswapV2Router02,
        functionName: "swapExactTokensForTokens",
        args: [args.amountIn, args.minOut, args.path, args.to, args.deadline],
        account: args.account, // important pour l'estimation
      });

      const gasPrice = await pc.getGasPrice();
      const feeWei = gas * gasPrice;
      const symbol = args.nativeSymbol ?? "tTRUST";
      return `${formatUnits(feeWei, 18)} ${symbol}`;
    } catch {
      return null;
    }
  };
}
