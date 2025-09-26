import React from "react";
import type { TokenHolding } from "../hooks/usePortfolio";

export function TokenHoldingsTable({ data }: { data: TokenHolding[] }) {
  return (
    <div className="rounded-2xl p-4 shadow">
      <h3 className="text-xl font-semibold mb-3">Tokens</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-white/10">
            <th className="py-2">Token</th>
            <th className="py-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((h, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="py-2">{h.token.symbol}</td>
              <td className="py-2 tabular-nums">{h.balanceFormatted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
