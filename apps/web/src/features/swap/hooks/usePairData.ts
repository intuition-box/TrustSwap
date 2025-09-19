import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { abi, addresses } from "@trustswap/sdk";
import { toWrapped } from "../../../lib/tokens";

export type PairData = {
  pair: Address;
  token0: Address;
  token1: Address;
  reserve0: bigint;
  reserve1: bigint;
};

const ZERO: Address = "0x0000000000000000000000000000000000000000";

export function usePairData() {
  const pc = usePublicClient();

  return async function fetchPair(tokenA: Address, tokenB: Address): Promise<PairData | null> {
    if (!pc) return null;
    if (!tokenA || !tokenB) return null;
    if (tokenA.toLowerCase() === tokenB.toLowerCase()) return null;

    // ⚠️ wrap natif -> WNATIVE avant d’interroger la factory
    const a = toWrapped(tokenA);
    const b = toWrapped(tokenB);

    try {
      const pair = (await pc.readContract({
        address: addresses.UniswapV2Factory as Address,
        abi: abi.UniswapV2Factory,
        functionName: "getPair",
        args: [a, b],
      })) as Address;

      if (!pair || pair.toLowerCase() === ZERO.toLowerCase()) {
        return null;
      }

      const [token0, token1, reserves] = await Promise.all([
        pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "token0" }) as Promise<Address>,
        pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "token1" }) as Promise<Address>,
        pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "getReserves" }) as Promise<[bigint, bigint, bigint]>,
      ]);

      return { pair, token0, token1, reserve0: reserves[0], reserve1: reserves[1] };
    } catch {
      return null;
    }
  };
}
