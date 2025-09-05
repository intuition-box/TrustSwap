// useGasEstimate.ts
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { abi, addresses } from "@trustswap/sdk";
import { formatUnits } from "viem";
import { buildPath } from "../../../lib/tokens"; // ou depuis tokens.ts si fusionné

export function useGasEstimate() {
  const pc = usePublicClient();

  return async function estimateNetworkFee(args: {
    account?: Address;
    amountIn: bigint;
    minOut: bigint;
    path: Address[];
    to: Address;
    deadline: bigint;
    nativeSymbol?: string;
  }): Promise<string | null> {
    if (!pc) return null;
    if (!args.account) return null;
    if (!args.path || args.path.length < 2) return null;

    const path = buildPath(args.path);
    const symbol = args.nativeSymbol ?? "tTRUST";

    try {
      if (args.amountIn <= 0n) return null;
      const gas = await pc.estimateContractGas({
        address: addresses.UniswapV2Router02 as Address,
        abi: abi.UniswapV2Router02,
        functionName: "swapExactTokensForTokens",
        args: [args.amountIn, args.minOut, path, args.to, args.deadline],
        account: args.account,
      });
      const gasPrice = await pc.getGasPrice();
      return `${formatUnits(gas * gasPrice, 18)} ${symbol}`;
    } catch (e) {
      // Fallback: baseline
      try {
        const gas = await pc.estimateContractGas({
          address: addresses.UniswapV2Router02 as Address,
          abi: abi.UniswapV2Router02,
          functionName: "swapExactTokensForTokens",
          args: [1n, 0n, path, args.to, args.deadline],
          account: args.account,
        });
        const gasPrice = await pc.getGasPrice();
        return `~${formatUnits(gas * gasPrice, 18)} ${symbol}`;
      } catch {
        return null;
      }
    }
  };
}
