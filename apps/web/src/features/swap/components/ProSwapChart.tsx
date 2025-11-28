import styles from "@ui/styles/Swap.module.css";

export function ProSwapChart() {
  return (
    <div className={styles.proChartRoot}>
      <div className={styles.proChartHeader}>
        <div className={styles.proChartPair}>
          <div className={styles.proChartPairIcons}>
            <span className={`${styles.tokenIcon} ${styles.tokenIconMain}`}>
              T
            </span>
            <span className={`${styles.tokenIcon} ${styles.tokenIconQuote}`}>
              E
            </span>
          </div>
          <div>
            <div className={styles.proChartPairSymbol}>USDT / ETH</div>
            <div className={styles.proChartPairPrice}>$32.93</div>
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
        <span className={styles.proChartPlaceholderText}>
          Candlestick chart placeholder
        </span>
      </div>
    </div>
  );
}
