import type { Address } from "viem";
import { getTokenByAddress, toWrapped } from "../../../lib/tokens";
import type { PairData } from "./usePairData";
import { formatUnits } from "viem";

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

  const tIn = getTokenByAddress(tokenIn);
  const tOut = getTokenByAddress(tokenOut);

  const wIn = toWrapped(tokenIn);
  const wOut = toWrapped(tokenOut);

  let reserveIn: bigint | undefined, reserveOut: bigint | undefined;
  if (wIn.toLowerCase() === pair.token0.toLowerCase()) {
    reserveIn = pair.reserve0; reserveOut = pair.reserve1;
  } else if (wIn.toLowerCase() === pair.token1.toLowerCase()) {
    reserveIn = pair.reserve1; reserveOut = pair.reserve0;
  } else {
    return null;
  }

  if (!reserveIn || !reserveOut) return null;

  const ri = Number(formatUnits(reserveIn, tIn.decimals));
  const ro = Number(formatUnits(reserveOut, tOut.decimals));
  if (!(ri > 0) || !(ro > 0)) return null;

  const mid = ro / ri;    
  const exec = aout / ain; 
  if (!(mid > 0) || !(exec > 0)) return null;

  const impact = ((mid - exec) / mid) * 100;
  const clamped = Math.max(0, Math.min(100, impact));
  return Math.round(clamped * 100) / 100; 
}
