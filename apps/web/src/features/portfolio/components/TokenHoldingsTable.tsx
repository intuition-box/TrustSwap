import React from "react";
import type { TokenHolding } from "../hooks/usePortfolio";
import styles from "../portfolio.module.css";

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
          {data.map((h, i) => (
            <tr key={i} className={styles.row}>
              <td className={styles.tokenCell}>
                <span className={styles.badge}>{h.token.symbol[0]}</span>
                <span>{h.token.symbol}</span>
              </td>
              <td className={styles.number}>{h.balanceFormatted}</td>
            </tr>
          ))}
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
