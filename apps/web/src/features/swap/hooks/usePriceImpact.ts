// usePriceImpact.ts
import type { Address } from "viem";
import type { PairData } from "./usePairData";
import { getTokenByAddressOrFallback, NATIVE_PLACEHOLDER, WNATIVE_ADDRESS } from "../../../lib/tokens";

const toPairAddr = (a: Address) =>
  a.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase() ? (WNATIVE_ADDRESS as Address) : a;

export function computePriceImpactPct(
  tokenIn: Address,
  tokenOut: Address,
  amountInStr: string,
  amountOutStr: string,
  pair: PairData | null
): number | null {
  const ain = Number(amountInStr || "0");
  const aout = Number(amountOutStr || "0");
  if (!pair || ain <= 0 || aout <= 0) return null;

  // ⚠️ ne jamais throw: on prend un fallback à 18 décimales si inconnu
  const tIn  = getTokenByAddressOrFallback(tokenIn);
  const tOut = getTokenByAddressOrFallback(tokenOut);

  // map aux adresses de la pair (token0/token1 sont des ERC-20 réels, pas le placeholder natif)
  const inAsPair  = toPairAddr(tokenIn);
  const outAsPair = toPairAddr(tokenOut);

  const isInToken0 = pair.token0.toLowerCase() === inAsPair.toLowerCase();
  const r0 = Number(pair.reserve0) / 10 ** (isInToken0 ? tIn.decimals : tOut.decimals);
  const r1 = Number(pair.reserve1) / 10 ** (isInToken0 ? tOut.decimals : tIn.decimals);

  const rIn  = isInToken0 ? r0 : r1;
  const rOut = isInToken0 ? r1 : r0;

  if (rIn <= 0 || rOut <= 0) return null;

  // spot avant trade et prix exec issus de la quote
  const spot = rOut / rIn;
  const exec = aout / ain;

  const impact = ((spot - exec) / spot) * 100;
  if (!isFinite(impact)) return null;
  return Math.max(0, impact);
}
