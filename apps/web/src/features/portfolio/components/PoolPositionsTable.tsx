import React from "react";
import type { PoolPosition } from "../hooks/usePortfolio";

export function PoolPositionsTable({ data }: { data: PoolPosition[] }) {
  if (!data.length) {
    return (
      <div className="rounded-2xl p-4 shadow">
        <h3 className="text-xl font-semibold mb-2">Pools</h3>
        <p className="text-sm opacity-70">No LP positions found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 shadow">
      <h3 className="text-xl font-semibold mb-3">Pools</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-white/10">
            <th className="py-2">Pair</th>
            <th className="py-2">LP Balance</th>
            <th className="py-2">Share</th>
            <th className="py-2">Underlying</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.pairAddress} className="border-b border-white/5">
              <td className="py-2">
                {p.token0.symbol} / {p.token1.symbol}
              </td>
              <td className="py-2 tabular-nums">{p.lpBalanceFormatted}</td>
              <td className="py-2">{p.sharePct}%</td>
              <td className="py-2 tabular-nums">
                {p.amount0Formatted} {p.token0.symbol} + {p.amount1Formatted} {p.token1.symbol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
