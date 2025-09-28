import React from "react";
import type { PoolPosition } from "../hooks/usePortfolio";
import styles from "../portfolio.module.css";
import { getTokenForUI } from "../../../lib/tokens";
import { getTokenIcon } from "../../../lib/getTokenIcon";

function formatSmart(value: string) {
  const num = Number(value);
  if (isNaN(num)) return value;
  if (Math.abs(num) >= 1) {
    return num.toFixed(2).replace(/\.?0+$/, "");
  } else {
    return num.toFixed(6).replace(/\.?0+$/, "");
  }
}

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
          {data.map((p) => {
            const t0 = getTokenForUI(p.token0.address) ?? p.token0;
            const t1 = getTokenForUI(p.token1.address) ?? p.token1;
            const icon0 = getTokenIcon(t0.address ?? "");
            const icon1 = getTokenIcon(t1.address ?? "");
            return (
              <tr key={p.pairAddress} className={styles.row}>
                <td className={styles.tokenCell}>
                  <img src={icon0} alt={t0.symbol} className={styles.tokenIcon} />
                  <span>{t0.symbol}</span>
                  <span className={styles.muted}> / </span>
                  <img src={icon1} alt={t1.symbol} className={styles.tokenIcon} />
                  <span>{t1.symbol}</span>
                </td>
                <td className={styles.number}>{formatSmart(p.lpBalanceFormatted)}</td>
                <td>{p.sharePct}%</td>
                <td className={styles.number}>
                  {formatSmart(p.amount0Formatted)} {t0.symbol} +{" "}
                  {formatSmart(p.amount1Formatted)} {t1.symbol}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
