import React from "react";
import type { Address } from "viem";
import type { PoolItem } from "../types";
import { IndexCell } from "./cells/IndexCell";
import { PoolCell } from "./cells/PoolCell";
import { TvlCell } from "./cells/TvlCell";
import { Volume1DCell } from "./cells/Volume1DCell";
import { PoolAprCell } from "./cells/PoolAprCell";
import { PoolActionsCell } from "./cells/PoolActionsCell";
import styles from "../tableau.module.css";
import { useTokenModule } from "../../../hooks/useTokenModule";

function asUIToken<T extends { address: string; symbol: string; decimals?: number }>(t: T): T {
  const { WNATIVE_ADDRESS } = useTokenModule();
  const isWNative = t?.address?.toLowerCase() === WNATIVE_ADDRESS.toLowerCase();
  if (!isWNative) return t;
  return { ...t, symbol: "tTRUST" } as T;
}

export default React.memo(PoolRow, (prev, next) => {
  const a = prev.pool, b = next.pool;
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
  const uiToken0 = asUIToken(pool.token0);
  const uiToken1 = asUIToken(pool.token1);

  return (
    <tr
      className={styles.ligneTableau}
      onClick={() => !loading && onOpenLiquidity(pool.token0.address, pool.token1.address)}
    >
      <IndexCell index={index} loading={loading} />

      {/* Display the tokens UI (symbol tTRUST if WTTRUST) */}
      <PoolCell token0={uiToken0} token1={uiToken1} pair={pool.pair} loading={loading} />

      {/* Pass also the UI tokens if needed (if TvlCell displays the symbols somewhere) */}
      <TvlCell
        value={pool.tvlNative}
        token0={uiToken0}
        token1={uiToken1}
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
