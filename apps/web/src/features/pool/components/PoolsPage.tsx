// apps/web/src/features/pools/components/PoolsPage.tsx
import { useMemo, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";

import GlobalStats from "./GlobalStats";
import { PoolsTable } from "./PoolsTable";
import { PoolsFilters } from "./filters/PoolsFilters";
import { PoolsPagination } from "./filters/PoolsPagination";
import { LiquidityModal } from "./liquidity/LiquidityModal";
import { useTokenModule } from "../../../hooks/useTokenModule";

import styles from "../pools.module.css";



export default function PoolsPage() {

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const [hasNextPage, setHasNextPage] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [tokenA, setTokenA] = useState<Address | undefined>();
  const [tokenB, setTokenB] = useState<Address | undefined>();
  const { toUIAddress } = useTokenModule();

  const pc = usePublicClient({ chainId: 13579 });

  const tableKey = useMemo(
    () => (pc ? `chain:${pc.chain?.id ?? "unknown"}:p${page}` : "init"),
    [pc?.chain?.id, page]
  );

  function openEmptyModal() {
    setTokenA(undefined);
    setTokenB(undefined);
    setIsOpen(true);
  }

  function openWithPair(a: Address, b: Address) {
    setTokenA(toUIAddress(a)!); // WTTRUST → tTRUST
    setTokenB(toUIAddress(b)!);
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
     <div className={styles.halo}></div>

      {/* Stats globales au-dessus du tableau */}
      <div className={styles.containerStat}>
        <GlobalStats />
      </div>

      <div className={styles.containerPool}>
        
        {/* Filtres + bouton Add Liquidity */}
        <div className={styles.filterPoolContainer}>
          <button
            onClick={openEmptyModal}
            className={styles.addLiquidityBtn}
            style={{ visibility: isOpen ? "hidden" : "visible", pointerEvents: isOpen ? "none" : "auto" }}
            aria-hidden={isOpen}
            tabIndex={isOpen ? -1 : 0}
          >
            + Add Liquidity
          </button>
          <PoolsFilters query={query} onQuery={setQuery} />
        </div>

        {/* Tableau des pools */}
        <div className={styles.tableauContainer}>
          <div className={styles.tableauContainerLineTop}></div>

          {/*  On ne monte la table que quand le client réseau est prêt */}
          {!pc ? (
            <div className={styles.loadingBox}>Initialisation du réseau…</div>
          ) : (
            <>
              <PoolsTable
                key={tableKey}
                page={page}
                query={query}
                onOpenLiquidity={openWithPair}
                onPageInfoChange={(info) => setHasNextPage(info.hasNextPage)}
              />

              <PoolsPagination
                page={page}
                hasNextPage={hasNextPage}
                onPage={onPageChange}
              />
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
