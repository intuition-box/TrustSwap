// usePairAddress.ts
import { useMemo } from "react";
import type { Address } from "viem";
import { useChainId } from "wagmi";
import { getAddresses } from "@trustswap/sdk";
import type { SwapToken } from "../SwapContext";

function sortTokens(a: Address, b: Address): [Address, Address] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

// TODO: replace body with real Uniswap V2 pair computation or SDK helper
function computePairAddress(factory: Address, tokenA: Address, tokenB: Address): Address {
  const [token0, token1] = sortTokens(tokenA, tokenB);
  console.warn("computePairAddress is a placeholder, plug your SDK implementation here", {
    factory,
    token0,
    token1,
  });
  return factory; // temporary placeholder, just to avoid crashes
}

export function usePairAddress(
  tokenIn: SwapToken | null,
  tokenOut: SwapToken | null,
): Address | null {
  const chainId = useChainId();
  const { UniswapV2Factory } = getAddresses(chainId);
  const factory = UniswapV2Factory as Address;

  return useMemo(() => {
    if (!tokenIn || !tokenOut) return null;
    try {
      return computePairAddress(factory, tokenIn.address, tokenOut.address);
    } catch (e) {
      console.error("Failed to compute pair address", e);
      return null;
    }
  }, [factory, tokenIn, tokenOut]);
}
