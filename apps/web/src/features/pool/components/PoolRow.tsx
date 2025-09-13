// apps/web/src/features/pools/components/PoolRow.tsx
import React from "react";
import type { Address } from "viem";
import type { PoolItem } from "../types";
import { IndexCell } from "./cells/IndexCell";
import { PoolCell } from "./cells/PoolCell";
import { TvlCell } from "./cells/TvlCell";
import { Volume1DCell } from "./cells/Volume1DCell";
import { PoolAprCell } from "./cells/PoolAprCell";
import { PoolActionsCell } from "./cells/PoolActionsCell"; // ✅ nouvelle cellule groupée
import styles from "../tableau.module.css";

// memo pour éviter rerenders inutiles
export default React.memo(PoolRow, (prev, next) => {
  const a = prev.pool,
    b = next.pool;
  return (
    a.pair === b.pair &&
    a.tvlNative === b.tvlNative &&
    a.vol1dNative === b.vol1dNative &&
    a.poolAprPct === b.poolAprPct &&
    prev.index === next.index
  );
});

export function PoolRow({
  index,
  pool,
  loading = false,
  onOpenLiquidity,
}: {
  index: number;
  pool: PoolItem;
  loading?: boolean;
  onOpenLiquidity: (a: Address, b: Address) => void;
}) {
  return (
    <tr
      className={styles.ligneTableau}
      onClick={() =>
        !loading &&
        onOpenLiquidity(pool.token0.address, pool.token1.address)
      }
    >
      <IndexCell index={index} loading={loading} />
      <PoolCell
        token0={pool.token0}
        token1={pool.token1}
        pair={pool.pair}
        loading={loading}
      />
      <TvlCell
        value={pool.tvlNative}
        token0={pool.token0}
        token1={pool.token1}
        reserve0={pool.reserve0}
        reserve1={pool.reserve1}
        loading={loading}
      />
      <Volume1DCell value={pool.vol1dNative} loading={loading} />
      <PoolAprCell value={pool.poolAprPct} loading={loading} />

      <PoolActionsCell pool={pool} loading={loading} />
    </tr>
  );
}
