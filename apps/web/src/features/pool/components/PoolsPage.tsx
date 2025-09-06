import { useState } from "react";
import type { Address } from "viem";
import { PoolsTable } from "./PoolsTable";
import { PoolsFilters } from "./filters/PoolsFilters";
import { PoolsPagination } from "./filters/PoolsPagination";
import { LiquidityModal } from "./liquidity/LiquidityModal";
import { getDefaultPair } from "../../../lib/tokens"; // ← adapte le chemin

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
    <div style={{ padding: 16 }}>
              <br />
        <br />
        <br />
                <br />
        <br />
        <br />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Pools</h1>


        <button onClick={openEmptyModal}>+ Add Liquidity</button>
      </div>

      <PoolsFilters query={query} onQuery={setQuery} />
      <PoolsTable page={page} query={query} onOpenLiquidity={openWithPair} />
      <PoolsPagination page={page} onPage={setPage} />

      {isOpen && (
        <LiquidityModal
          tokenA={tokenA}
          tokenB={tokenB}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
