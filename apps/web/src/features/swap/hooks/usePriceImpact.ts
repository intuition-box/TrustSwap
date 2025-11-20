// usePriceImpact.ts
import type { Address } from "viem";
import type { PairData } from "./usePairData";
import type { TokenInfo } from "../../../lib/tokens";
import { formatUnits } from "viem";

const num = (x: string | number | undefined) => {
  const n = Number(String(x ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
};

const toBi = (x: unknown): bigint | null => {
  try {
    if (typeof x === "bigint") return x;
    if (typeof x === "number") return BigInt(Math.trunc(x));
    if (typeof x === "string") return BigInt(x);
    return null;
  } catch {
    return null;
  }
};

const safeUnits = (v: bigint, decimals: number): number => {
  try {
    return Number(formatUnits(v, decimals));
  } catch {
    const s = v.toString();
    if (decimals <= 0) return Number(s);
    const len = s.length;
    const int = len > decimals ? s.slice(0, len - decimals) : "0";
    const frac = len > decimals ? s.slice(len - decimals) : s.padStart(decimals, "0");
    return Number(`${int}.${frac}`) || 0;
  }
};

export type PriceImpactHelpers = {
  NATIVE_PLACEHOLDER: Address;
  WNATIVE_ADDRESS: Address;
  getTokenByAddressOrFallback: (addr: Address) => TokenInfo;
};

export function computePriceImpactPct(
  tokenIn: Address,
  tokenOut: Address,
  amountInStr: string,
  amountOutStr: string,
  pair: PairData | null,
  helpers: PriceImpactHelpers
): number | null {
  const ain = num(amountInStr);
  const aout = num(amountOutStr);
  if (ain <= 0 || aout <= 0) return null;

  if (!pair) return null;

  const { NATIVE_PLACEHOLDER, WNATIVE_ADDRESS, getTokenByAddressOrFallback } = helpers;

  const wrap = (a: Address) =>
    a?.toLowerCase?.() === NATIVE_PLACEHOLDER.toLowerCase()
      ? (WNATIVE_ADDRESS as Address)
      : a;

  const inAsPair = wrap(tokenIn)?.toLowerCase?.();
  const outAsPair = wrap(tokenOut)?.toLowerCase?.();
  const t0 = (pair as any).token0?.toLowerCase?.();
  const t1 = (pair as any).token1?.toLowerCase?.();
  if (!inAsPair || !outAsPair || !t0 || !t1) return null;

  if (!((inAsPair === t0 || inAsPair === t1) && (outAsPair === t0 || outAsPair === t1))) {
    return null;
  }

  const r0bi = toBi((pair as any).reserve0);
  const r1bi = toBi((pair as any).reserve1);
  if (r0bi === null || r1bi === null) return null;

  const d0 =
    typeof (pair as any).decimals0 === "number"
      ? (pair as any).decimals0
      : getTokenByAddressOrFallback((pair as any).token0 as Address)?.decimals ?? 18;

  const d1 =
    typeof (pair as any).decimals1 === "number"
      ? (pair as any).decimals1
      : getTokenByAddressOrFallback((pair as any).token1 as Address)?.decimals ?? 18;

  const R0 = safeUnits(r0bi, d0);
  const R1 = safeUnits(r1bi, d1);
  if (R0 <= 0 || R1 <= 0 || !isFinite(R0) || !isFinite(R1)) return null;

  const inIs0 = inAsPair === t0;
  const rIn = inIs0 ? R0 : R1;
  const rOut = inIs0 ? R1 : R0;
  if (rIn <= 0 || rOut <= 0) return null;

  const spot = rOut / rIn;
  const exec = aout / ain;
  if (!isFinite(spot) || !isFinite(exec) || spot <= 0 || exec <= 0) return null;

  let impact = ((spot - exec) / spot) * 100;

  if (!isFinite(impact)) return null;
  if (impact < 0) impact = 0;
  if (impact > 100) impact = 100;

  return impact;
}
