import { getTokenByAddress } from "../../../lib/tokens";
import type { Address } from "viem";

export default function Summary({
  tokenIn, tokenOut, amountIn, amountOut
}: { tokenIn: Address; tokenOut: Address; amountIn: string; amountOut: string }) {
  const ti = getTokenByAddress(tokenIn);
  const to = getTokenByAddress(tokenOut);

  const price = (Number(amountIn) > 0 && Number(amountOut) > 0)
    ? (Number(amountOut) / Number(amountIn))
    : undefined;

  return (
    <div style={{ fontSize: 14, opacity: 0.85 }}>
      {price
        ? <>1 {ti.symbol} ≈ {price.toFixed(6)} {to.symbol}</>
        : <>—</>
      }
    </div>
  );
}
