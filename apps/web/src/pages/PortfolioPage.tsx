import React from "react";
import { usePortfolio } from "../features/portfolio/hooks/usePortfolio";
import { TokenHoldingsTable } from "../features/portfolio/components/TokenHoldingsTable";
import { PoolPositionsTable } from "../features/portfolio/components/PoolPositionsTable";

export default function PortfolioPage() {
  const { holdings, positions, loading, error } = usePortfolio();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Portfolio</h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </div>
      )}

      {loading && <div className="mb-4 text-sm opacity-70">Loading portfolio…</div>}

      {holdings && <TokenHoldingsTable data={holdings} />}

      <div className="h-6" />

      {positions && <PoolPositionsTable data={positions} />}
    </div>
  );
}
