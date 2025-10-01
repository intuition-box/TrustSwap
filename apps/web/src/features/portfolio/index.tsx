import React from "react";
import { usePortfolio } from "./hooks/usePortfolio";
import { TokenHoldingsTable } from "./components/TokenHoldingsTable";
import { PoolPositionsTable } from "./components/PoolPositionsTable";
import styles from "./portfolio.module.css";
import { useAccount } from "wagmi";

export default function PortfolioPage() {
  const { holdings, positions, loading, error } = usePortfolio();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className={styles.sectionPortfolio}>
        <div className={styles.connectPrompt}>
          Connect your wallet
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sectionPortfolio}>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </div>
      )}

      {loading && <div className="mb-4 text-sm opacity-70">Loading portfolio…</div>}

      {holdings && <TokenHoldingsTable data={holdings} />}
      {positions && <PoolPositionsTable data={positions} />}
    </div>
  );
}
