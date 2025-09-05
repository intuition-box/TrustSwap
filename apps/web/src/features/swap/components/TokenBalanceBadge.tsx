import type { Address } from "viem";
import { useTokenBalance } from "../hooks/useTokenBalance";
import styles from "@ui/styles/Swap.module.css";

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
      className={styles.badgeBalance}
      title="Balance"
      onClick={() => formatted && onClickMax?.(formatted)}
      role={onClickMax ? "button" : undefined}
    >
    {isLoading ? (
      <span className={styles.label}>Balance…</span>
    ) : (
      <>
        <span className={styles.label}>Balance: </span>
        <span className={styles.amountBalance}>
          {formatted ?? "0"}
        </span>
      </>
    )}
    </span>
  );
}
