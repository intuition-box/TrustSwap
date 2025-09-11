// apps/web/src/features/pools/components/PoolsPage.tsx
import React, { useMemo, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";

import GlobalStats from "./GlobalStats";
import { PoolsTable } from "./PoolsTable";
import { PoolsFilters } from "./filters/PoolsFilters";
import { PoolsPagination } from "./filters/PoolsPagination";
import { LiquidityModal } from "./liquidity/LiquidityModal";
import { getDefaultPair } from "../../../lib/tokens";

import styles from "../pools.module.css";

export default function PoolsPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [tokenA, setTokenA] = useState<Address | undefined>();
  const [tokenB, setTokenB] = useState<Address | undefined>();

  const pc = usePublicClient({ chainId: 13579 });

  const tableKey = useMemo(
    () => (pc ? `chain:${pc.chain?.id ?? "unknown"}:p${page}` : "init"),
    [pc?.chain?.id, page]
  );

  function openEmptyModal() {
    const { tokenIn, tokenOut } = getDefaultPair();
    setTokenA(tokenIn.address);
    setTokenB(tokenOut.address);
    setIsOpen(true);
  }

  function openWithPair(a: Address, b: Address) {
    setTokenA(a);
    setTokenB(b);
    setIsOpen(true);
  }

  function onPageChange(next: number) {
    setPage(next);
    // confort UX: remonte en haut sur changement de page
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  }

  return (
    <div className={styles.sectionPool}>


      {/* Stats globales au-dessus du tableau */}
      <div className={styles.containerStat}>
        <GlobalStats />
      </div>

      <div className={styles.containerPool}>
        {/* Filtres + bouton Add Liquidity */}
        <div className={styles.filterPoolContainer}>
          <button onClick={openEmptyModal} className={styles.addLiquidityBtn}>
            + Add Liquidity
          </button>
          <PoolsFilters query={query} onQuery={setQuery} />
        </div>

        {/* Tableau des pools */}
        <div className={styles.tableauContainer}>
          <div className={styles.tableauContainerLineTop}></div>

          {/* ⛳️ On ne monte la table que quand le client réseau est prêt */}
          {!pc ? (
            <div className={styles.loadingBox}>Initialisation du réseau…</div>
          ) : (
            <>
              <PoolsTable
                key={tableKey}
                page={page}
                query={query}
                onOpenLiquidity={openWithPair}
              />
              <PoolsPagination page={page} onPage={onPageChange} />
            </>
          )}

          {/* Modal d’ajout de liquidité */}
          {isOpen && (
            <LiquidityModal
              tokenA={tokenA}
              tokenB={tokenB}
              onClose={() => setIsOpen(false)}
            />
          )}

          <div className={styles.tableauContainerLineBottom}></div>
        </div>
      </div>
    </div>
  );
}
