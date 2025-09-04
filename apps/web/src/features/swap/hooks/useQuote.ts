import type { Address } from "viem";
import { formatUnits, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { getTokenByAddress } from "../../../lib/tokens";
import { abi, addresses } from "@trustswap/sdk";

export function useQuote() {
  const pc = usePublicClient();

  return async function quote(tokenIn: Address, tokenOut: Address, amountInStr: string) {
    const ti = getTokenByAddress(tokenIn);
    const amtIn = parseUnits(amountInStr || "0", ti.decimals);

    const amounts = await pc.readContract({
      address: addresses.UniswapV2Router02 as Address,
      abi: abi.UniswapV2Router02,
      functionName: "getAmountsOut",
      args: [amtIn, [tokenIn, tokenOut]],
    }) as bigint[];

    const out = amounts[amounts.length - 1] ?? 0n;
    const to = getTokenByAddress(tokenOut);
    return formatUnits(out, to.decimals);
  };
}
