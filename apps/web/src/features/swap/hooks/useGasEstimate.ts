// useGasEstimate.ts
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { abi, addresses } from "@trustswap/sdk";
import { formatUnits } from "viem";
import { buildPath } from "../../../lib/tokens";

type Args = {
  account?: Address;
  amountIn: bigint;
  minOut: bigint;
  path: Address[];
  to: Address;
  deadline: bigint;
  nativeSymbol?: string;
  // NEW (optionnel) : indique si l'entrée/sortie est NATIVE (tTRUST)
  nativeIn?: boolean;
  nativeOut?: boolean;
};

export function useGasEstimate() {
  const pc = usePublicClient();

  return async function estimateNetworkFee(args: Args): Promise<string | null> {
    if (!pc) return null;
    if (!args.account) return null;
    if (!args.path || args.path.length < 2) return null;

    const path = buildPath(args.path);
    const symbol = args.nativeSymbol ?? "tTRUST";
    const nativeIn = !!args.nativeIn;
    const nativeOut = !!args.nativeOut;

    // Détermine la bonne fonction du router
    // - ETH -> Token : swapExactETHForTokens (value = amountIn)
    // - Token -> ETH : swapExactTokensForETH
    // - Token -> Token : swapExactTokensForTokens
    const fn =
      nativeIn && !nativeOut
        ? "swapExactETHForTokens"
        : !nativeIn && nativeOut
        ? "swapExactTokensForETH"
        : !nativeIn && !nativeOut
        ? "swapExactTokensForTokens"
        : null; // ETH -> ETH (non-sens)

    if (!fn) return null;

    // Construit les args selon la fonction
    const argsByFn: Record<
      NonNullable<typeof fn>,
      readonly unknown[]
    > = {
      swapExactETHForTokens: [args.minOut, path, args.to, args.deadline] as const,
      swapExactTokensForETH: [args.amountIn, args.minOut, path, args.to, args.deadline] as const,
      swapExactTokensForTokens: [args.amountIn, args.minOut, path, args.to, args.deadline] as const,
    };

    const value = fn === "swapExactETHForTokens" ? args.amountIn : undefined;

    try {
      const gas = await pc.estimateContractGas({
        address: addresses.UniswapV2Router02 as Address,
        abi: abi.UniswapV2Router02,
        functionName: fn,
        args: argsByFn[fn],
        account: args.account,
        ...(value ? { value } : {}),
      });
      const gasPrice = await pc.getGasPrice();
      return `${formatUnits(gas * gasPrice, 18)} ${symbol}`;
    } catch {
      // Fallback avec montants minimaux
      try {
        const fallbackArgs =
          fn === "swapExactETHForTokens"
            ? ([0n, path, args.to, args.deadline] as const)
            : ([1n, 0n, path, args.to, args.deadline] as const);

        const gas = await pc.estimateContractGas({
          address: addresses.UniswapV2Router02 as Address,
          abi: abi.UniswapV2Router02,
          functionName: fn,
          args: fallbackArgs,
          account: args.account,
          ...(fn === "swapExactETHForTokens" ? { value: 1n } : {}),
        });
        const gasPrice = await pc.getGasPrice();
        return `~${formatUnits(gas * gasPrice, 18)} ${symbol}`;
      } catch {
        return null;
      }
    }
  };
}
