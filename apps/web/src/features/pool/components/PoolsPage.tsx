import { useState } from "react";
import type { Address } from "viem";
import { PoolsTable } from "./PoolsTable";
import { PoolsFilters } from "./filters/PoolsFilters";
import { PoolsPagination } from "./filters/PoolsPagination";
import { LiquidityModal } from "./liquidity/LiquidityModal";
import { getDefaultPair } from "../../../lib/tokens"; // ← adapte le chemin
import GlobalStats from "./GlobalStats";
import styles from "../pools.module.css";

export default function PoolsPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [tokenA, setTokenA] = useState<Address | undefined>();
  const [tokenB, setTokenB] = useState<Address | undefined>();

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

  return (
    <div className={styles.sectionPool}>
      <div className={styles.halo}></div> {/* halo au fond */}
      <div>
        <GlobalStats />
      </div>
      <div className={styles.containerPool}>
        <div className={styles.filterPoolContainer}>
          <button onClick={openEmptyModal} className={styles.addLiquidityBtn}>
            + Add Liquidity
          </button>
          <PoolsFilters query={query} onQuery={setQuery} />
        </div>
  
        <div className={styles.tableauContainer}>
          <div className={styles.tableauContainerLineTop}></div>
          <PoolsTable page={page} query={query} onOpenLiquidity={openWithPair} />
          <PoolsPagination page={page} onPage={setPage} />
  
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
