// web/src/hooks/swap/useQuoteDetails.ts
import type { Address } from "viem";
import { parseUnits, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { abi } from "@trustswap/sdk";
import { useTokenModule } from "../../../hooks/useTokenModule";
import { useTrustswapAddresses } from "../../../hooks/useTrustswapAddresses";

function getDecimalsSafe(addr: Address, isNative: (a?: Address) => boolean, getTokenByAddress: (addr: Address) => { decimals: number }) {
  if (isNative(addr)) return 18;
  try {
    return getTokenByAddress(addr).decimals ?? 18;
  } catch {
    return 18;
  }
}

export function useQuoteDetails() {
  const pc = usePublicClient();
  const { UniswapV2Router02, WTTRUST } = useTrustswapAddresses();

  const {
    NATIVE_PLACEHOLDER,
    WNATIVE_ADDRESS,
    isNative,
    toWrapped,
    getTokenByAddress,
  } = useTokenModule();

  return async function getQuoteDetails(
    tokenIn: Address,
    tokenOut: Address,
    amountInStr: string
  ): Promise<{
    amountOutFormatted: string;
    amountOutBn: bigint;
    path: Address[];
    decimalsOut: number;
  } | null> {
    if (!pc) return null;

    const v = Number(String(amountInStr).replace(",", "."));
    if (!isFinite(v) || v <= 0) return null;

    const decimalsIn = getDecimalsSafe(tokenIn, isNative, getTokenByAddress);
    const decimalsOut = getDecimalsSafe(tokenOut, isNative, getTokenByAddress);
    const amountIn = parseUnits(String(v), decimalsIn);

    const router = UniswapV2Router02 as Address;
    const wNativeFromAddrs = WTTRUST as Address;
    const wNative = WNATIVE_ADDRESS ?? wNativeFromAddrs;

    const nativeEq = (a?: Address) =>
      !!a && a.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

    const wrap = (a: Address) =>
      nativeEq(a) || isNative(a) ? wNative : a;

    const direct = [wrap(tokenIn), wrap(tokenOut)] as Address[];
    const viaW = [wrap(tokenIn), wNative, wrap(tokenOut)] as Address[];

    const candidates: Address[][] = [];
    const same =
      direct.length === viaW.length && direct.every((x, i) => x === viaW[i]);
    candidates.push(direct);
    if (!same) candidates.push(viaW);

    const tryPath = async (path: Address[]) => {
      try {
        const amounts = (await pc.readContract({
          address: router,
          abi: abi.UniswapV2Router02,
          functionName: "getAmountsOut",
          args: [amountIn, path],
        })) as bigint[];
        return { out: amounts[amounts.length - 1], path };
      } catch {
        return null;
      }
    };

    const quotes = await Promise.all(candidates.map(tryPath));
    const valid = quotes.filter(Boolean) as { out: bigint; path: Address[] }[];
    if (!valid.length) return null;

    const best = valid.sort((a, b) => (a.out < b.out ? 1 : -1))[0];

    return {
      amountOutFormatted: formatUnits(best.out, decimalsOut),
      amountOutBn: best.out,
      path: best.path,
      decimalsOut,
    };
  };
}
