import type { Address } from "viem";
import { useTokenBalance } from "../hooks/useTokenBalance";
import styles from "@ui/styles/Swap.module.css";

// helper pour couper les décimales sans convertir en Number
function trimDecimals(value: string, decimals = 5) {
  if (!value.includes(".")) return value;
  const [int, frac] = value.split(".");
  return frac.length > decimals ? `${int}.${frac.slice(0, decimals)}` : value;
}

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

  // valeur tronquée à 5 décimales
  const display = formatted ? trimDecimals(formatted, 5) : "0";

  return (
    <span
      className={styles.badgeBalance}
      title="Balance"
      onClick={() => formatted && onClickMax?.(trimDecimals(formatted, 5))}
      role={onClickMax ? "button" : undefined}
    >
      {isLoading ? (
        <span className={styles.label}>Balance…</span>
      ) : (
        <>
          <span className={styles.label}>Balance: </span>
          <span className={styles.amountBalance}>{display}</span>
        </>
      )}
    </span>
  );
}
