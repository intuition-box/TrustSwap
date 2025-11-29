import styles from "@ui/styles/Swap.module.css";
import { useSwapContext } from "../SwapContext";
import { usePairAddress } from "../hooks/usePairAddress";
import { usePairChartData } from "../hooks/usePairChartData";

export function ProSwapChart() {
  const { tokenIn, tokenOut, pairAddress } = useSwapContext();
  const { data, isLoading } = usePairChartData(pairAddress);

  const symbol =
    tokenIn && tokenOut ? `${tokenIn.symbol} / ${tokenOut.symbol}` : "Select a pair";

  const lastPrice = data?.lastPrice ?? "-";

  return (
    <div className={styles.proChartRoot}>
      <div className={styles.proChartHeader}>
        <div className={styles.proChartPair}>
          <div className={styles.proChartPairIcons}>
            <span className={`${styles.tokenIcon} ${styles.tokenIconMain}`}>
              {tokenIn?.symbol?.[0] ?? "?"}
            </span>
            <span className={`${styles.tokenIcon} ${styles.tokenIconQuote}`}>
              {tokenOut?.symbol?.[0] ?? "?"}
            </span>
          </div>
          <div>
            <div className={styles.proChartPairSymbol}>{symbol}</div>
            <div className={styles.proChartPairPrice}>{lastPrice}</div>
          </div>
        </div>

        <div className={styles.proChartTimeframes}>
          {["1H", "1D", "1W", "1M"].map((t) => (
            <button key={t} className={styles.proChartTfButton}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.proChartCanvas}>
        {!pairAddress ? (
          <span className={styles.proChartPlaceholderText}>
            Select a pair to see the chart
          </span>
        ) : isLoading ? (
          <span className={styles.proChartPlaceholderText}>Loading chart...</span>
        ) : (
          <span className={styles.proChartPlaceholderText}>
            Chart rendering with indexer data
          </span>
        )}
      </div>
    </div>
  );
}