// features/portfolio/components/TokenHoldingsTable.tsx
import React from "react";
import type { TokenHolding } from "../hooks/usePortfolio";
import styles from "../portfolio.module.css";
import { getTokenForUI, NATIVE_PLACEHOLDER } from "../../../lib/tokens";
import { getTokenIcon } from "../../../lib/getTokenIcon";

function formatSmart(value: string) {
  const num = Number(value);
  if (isNaN(num)) return value;
  return Math.abs(num) >= 1
    ? num.toFixed(2).replace(/\.?0+$/, "")
    : num.toFixed(6).replace(/\.?0+$/, "");
}

export function TokenHoldingsTable({ data }: { data: TokenHolding[] }) {
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
            // Map to UI token (WTTRUST -> tTRUST etc.)
            const uiToken = getTokenForUI(h.token.address) ?? h.token;
            // Always provide an address for icon: native -> NATIVE_PLACEHOLDER
            const addrForIcon = (uiToken.address ?? NATIVE_PLACEHOLDER) as string;
            const icon = getTokenIcon(addrForIcon);

            return (
              <tr key={i} className={styles.row}>
                <td className={styles.tokenCell}>
                  <img src={icon} alt={uiToken.symbol} className={styles.tokenIcon} />
                  <span>{uiToken.symbol}</span>
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
