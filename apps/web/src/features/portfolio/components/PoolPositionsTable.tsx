import React from "react";
import type { PoolPosition } from "../hooks/usePortfolio";
import styles from "../portfolio.module.css";

export function PoolPositionsTable({ data }: { data: PoolPosition[] }) {
  if (!data.length) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Pools</h3>
        <p className={styles.empty}>No LP positions found.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Pools</h3>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th>Pair</th>
            <th>LP Balance</th>
            <th>Share</th>
            <th>Underlying</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.pairAddress} className={styles.row}>
              <td>
                {p.token0.symbol} / {p.token1.symbol}
              </td>
              <td className={styles.number}>{p.lpBalanceFormatted}</td>
              <td>{p.sharePct}%</td>
              <td className={styles.number}>
                {p.amount0Formatted} {p.token0.symbol} + {p.amount1Formatted} {p.token1.symbol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
