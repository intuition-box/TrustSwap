// apps/web/src/features/pools/components/cells/TvlCell.tsx
import { fmt, fmtUnits } from "../../utils";
import styles from "../../tableau.module.css";

type TokenInfo = {
  address: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
};

export function TvlCell({
  value,
  token0,
  token1,
  reserve0,
  reserve1,
  loading = false,
}: {
  value?: number;           // TVL en WTTRUST (ou $ selon ton choix)
  token0: TokenInfo;
  token1: TokenInfo;
  reserve0: bigint;
  reserve1: bigint;
  loading?: boolean;
}) {
  const q0 = fmtUnits(reserve0 ?? 0n, token0.decimals, 4);
  const q1 = fmtUnits(reserve1 ?? 0n, token1.decimals, 4);

  return (
    <td className={styles.tvlCell}>
      {loading ? (
        <div className={styles.skeletonLine}></div>
      ) : (
        <div className={styles.tooltip}>
          <span>
            <span className={styles.dollarSymbol}>$</span>
            {fmt(value)}
          </span>

          {/* Contenu du tooltip au survol */}
          <div className={styles.tooltipContent}>
            <div className={styles.tokenLine}>
              {token0.logoURI ? (
                <img src={token0.logoURI} alt={token0.symbol} onError={(e:any)=>{e.currentTarget.style.display='none';}} />
              ) : null}
              <span>{q0} {token0.symbol}</span>
              <span>/</span>
              {token1.logoURI ? (
                <img src={token1.logoURI} alt={token1.symbol} onError={(e:any)=>{e.currentTarget.style.display='none';}} />
              ) : null}
              <span>{q1} {token1.symbol}</span>
            </div>
          </div>
        </div>
      )}
    </td>
  );
}
