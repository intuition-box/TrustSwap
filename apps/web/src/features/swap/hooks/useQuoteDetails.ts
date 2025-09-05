import type { Address } from "viem";
import { parseUnits, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { getTokenByAddress, NATIVE_PLACEHOLDER } from "../../../lib/tokens";
import { abi, addresses } from "@trustswap/sdk";

const ROUTER = addresses.UniswapV2Router02 as Address;
const WNATIVE = addresses.WTTRUST as Address;

const isNative = (a?: Address) =>
  !!a && a.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();
const toWrapped = (a: Address) => (isNative(a) ? WNATIVE : a);

function getDecimalsSafe(addr: Address) {
  if (isNative(addr)) return 18;
  try { return getTokenByAddress(addr).decimals ?? 18; } catch { return 18; }
}

export function useQuoteDetails() {
  const pc = usePublicClient();

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

    const decimalsIn = getDecimalsSafe(tokenIn);
    const decimalsOut = getDecimalsSafe(tokenOut);
    const amountIn = parseUnits(String(v), decimalsIn);

    const direct = [toWrapped(tokenIn), toWrapped(tokenOut)] as Address[];
    const viaW   = [toWrapped(tokenIn), WNATIVE, toWrapped(tokenOut)] as Address[];

    const candidates: Address[][] = [];
    const same = direct.length === viaW.length && direct.every((x, i) => x === viaW[i]);
    candidates.push(direct);
    if (!same) candidates.push(viaW);

    const tryPath = async (path: Address[]) => {
      try {
        const amounts = await pc.readContract({
          address: ROUTER,
          abi: abi.UniswapV2Router02,
          functionName: "getAmountsOut",
          args: [amountIn, path],
        }) as bigint[];
        return { out: amounts[amounts.length - 1], path };
      } catch { return null; }
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
