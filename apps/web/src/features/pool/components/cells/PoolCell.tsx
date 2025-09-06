import type { Address } from "viem";
import type { TokenInfo } from "../../types";

export function PoolCell({
  token0,
  token1,
  pair,
  onOpenLiquidity,
}: {
  token0: TokenInfo;
  token1: TokenInfo;
  pair: string;
  onOpenLiquidity?: (a: Address, b: Address) => void;
}) {
  return (
    <td>
      <button
        title="Open liquidity actions"
        onClick={() => onOpenLiquidity?.(token0.address as Address, token1.address as Address)}
        style={{ display: "flex", gap: 8, alignItems: "center", border: "none", padding: 0, cursor: "pointer" }}
      >
        <span>{token0.symbol}/{token1.symbol}</span>
      </button>
    </td>
  );
}
