import type { Address } from "viem";
import { useTokenBalance } from "../hooks/useTokenBalance";

export default function TokenBalanceBadge({
  token,
  owner,
  onClickMax,
}: {
  token?: Address;
  owner?: Address;
  onClickMax?: (formatted: string) => void;
}) {
  const { formatted, isLoading } = useTokenBalance(token, owner);

  if (!owner || !token) return null;

  return (
    <span
      title="Balance"
      onClick={() => formatted && onClickMax?.(formatted)}
      role={onClickMax ? "button" : undefined}
    >
      {isLoading ? "Balance…" : `Balance: ${formatted ?? "0"}`}
    </span>
  );
}
