import React from "react";
import type { TokenHolding } from "../hooks/usePortfolio";
import styles from "../portfolio.module.css";
import { useTokenModule } from "../../../hooks/useTokenModule";
import { getTokenIcon } from "../../../lib/getTokenIcon";

function formatSmart(value: string) {
  const num = Number(value);
  if (isNaN(num)) return value;
  return Math.abs(num) >= 1
    ? num.toFixed(2).replace(/\.?0+$/, "")
    : num.toFixed(6).replace(/\.?0+$/, "");
}

export function TokenHoldingsTable({ data }: { data: TokenHolding[] }) {
  const { getTokenForUI, NATIVE_PLACEHOLDER } = useTokenModule();

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Tokens</h3>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th>Token</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((h, i) => {
            const isNative = !h.token.address;

            // For native token, map to UI token (TRUST / tTRUST)
            // For all ERC20 (including wTRUST), keep the raw token from the portfolio hook
            const displayToken = isNative
              ? getTokenForUI(NATIVE_PLACEHOLDER) ?? h.token
              : h.token;

            const addrForIcon = (displayToken.address ?? NATIVE_PLACEHOLDER) as string;
            const icon = getTokenIcon(addrForIcon);

            return (
              <tr key={i} className={styles.row}>
                <td className={styles.tokenCell}>
                  <img src={icon} alt={displayToken.symbol} className={styles.tokenIcon} />
                  <span>{displayToken.symbol}</span>
                </td>
                <td className={styles.number}>{formatSmart(h.balanceFormatted)}</td>
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr>
              <td colSpan={2} className={styles.empty}>
                No tokens found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
