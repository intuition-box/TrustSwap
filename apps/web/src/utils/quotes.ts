// utils/quotes.ts
import { parseUnits, formatUnits } from "viem";

/** Safe quote: amountOut = amountIn * reserveOut / reserveIn */
export function quoteOutFromReserves(
  amountInStr: string,
  inDecimals: number,
  outDecimals: number,
  reserveInWeiRaw: unknown,
  reserveOutWeiRaw: unknown
): string | null {
  // early exits
  if (!amountInStr || Number(amountInStr) <= 0) return null;

  // 🔒 force BigInt for reserves (avoid "Cannot mix BigInt and other types")
  const reserveInWei =
    typeof reserveInWeiRaw === "bigint"
      ? reserveInWeiRaw
      : (typeof reserveInWeiRaw === "string" || typeof reserveInWeiRaw === "number"
          ? BigInt(reserveInWeiRaw)
          : 0n);
  const reserveOutWei =
    typeof reserveOutWeiRaw === "bigint"
      ? reserveOutWeiRaw
      : (typeof reserveOutWeiRaw === "string" || typeof reserveOutWeiRaw === "number"
          ? BigInt(reserveOutWeiRaw)
          : 0n);

  if (reserveInWei === 0n || reserveOutWei === 0n) return null;

  // amountIn as BigInt
  const ain = parseUnits(amountInStr, inDecimals); // BigInt
  const aout = (ain * reserveOutWei) / reserveInWei; // BigInt

  return formatUnits(aout, outDecimals); // string
}
