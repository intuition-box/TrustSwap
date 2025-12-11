// apps/web/src/features/swap/components/ProSwapChart.tsx
import { useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import styles from "@ui/styles/Swap.module.css";
import { useSwapContext } from "../SwapContext";
import { usePairChartData } from "../hooks/usePairChartData";
import { useRecentSwapsForPair } from "../hooks/useRecentSwapsForPair";

type Timeframe = "1H" | "1D" | "1W" | "1M";

export function ProSwapChart() {
  const { tokenIn, tokenOut, pairAddress } = useSwapContext();
  const { data, isLoading } = usePairChartData(pairAddress);
  const { data: recentSwaps } = useRecentSwapsForPair(pairAddress);
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");

  // Try to get symbols from recent activity first (consistent with table),
  // fallback to context token symbols, fallback to "Token0/Token1".
  const firstSwap = recentSwaps[0];

  const inSymbolFromData = firstSwap?.inSymbol;
  const outSymbolFromData = firstSwap?.outSymbol;

  const inSymbol =
    inSymbolFromData ||
    (typeof tokenIn?.symbol === "string" ? tokenIn.symbol : undefined);
  const outSymbol =
    outSymbolFromData ||
    (typeof tokenOut?.symbol === "string" ? tokenOut.symbol : undefined);

  const pairSymbol =
    inSymbol && outSymbol ? `${inSymbol} / ${outSymbol}` : "Select a pair";

  const lastPrice = data?.lastPrice ?? "-";

  const filteredCandles = useMemo(() => {
    if (!data?.candles || data.candles.length === 0) return [];

    const nowMs = Date.now();
    let deltaMs = 0;

    switch (timeframe) {
      case "1H":
        deltaMs = 1 * 60 * 60 * 1000;
        break;
      case "1D":
        deltaMs = 24 * 60 * 60 * 1000;
        break;
      case "1W":
        deltaMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case "1M":
        deltaMs = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        return data.candles;
    }

    const cutoff = nowMs - deltaMs;

    return data.candles.filter((c) => {
      const tsMs = c.timestamp > 10_000_000_000 ? c.timestamp : c.timestamp * 1000;
      return tsMs >= cutoff;
    });
  }, [data, timeframe]);

  const series = useMemo(
    () => [
      {
        name: "Price",
        data: filteredCandles.map((c) => ({
          x:
            c.timestamp > 10_000_000_000
              ? new Date(c.timestamp)
              : new Date(c.timestamp * 1000),
          y: [c.open, c.high, c.low, c.close],
        })),
      },
    ],
    [filteredCandles],
  );

  const options: ApexOptions = {
    chart: {
      type: "candlestick",
      height: 260,
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#2ecc71",
          downward: "#ff4d4d",
        },
        wick: {
          useFillColor: true,
        },
      },
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: {
          colors: "#888888",
          fontSize: "10px",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#888888",
          fontSize: "10px",
        },
      },
      tooltip: {
        enabled: true,
      },
    },
    grid: {
      borderColor: "rgba(255,255,255,0.08)",
      strokeDashArray: 4,
      padding: {
        left: 0,
        right: 0,
      },
    },
    tooltip: {
      theme: "dark",
      x: {
        format: "dd MMM HH:mm",
      },
    },
  };

  const hasData = filteredCandles.length > 0;

  const baseInitial = inSymbol?.[0] ?? "?";
  const quoteInitial = outSymbol?.[0] ?? "?";

  return (
    <div className={styles.proChartRoot}>
      <div className={styles.proChartHeader}>
        <div className={styles.proChartPair}>
          <div className={styles.proChartPairIcons}>
            <span className={`${styles.tokenIcon} ${styles.tokenIconMain}`}>
              {baseInitial}
            </span>
            <span className={`${styles.tokenIcon} ${styles.tokenIconQuote}`}>
              {quoteInitial}
            </span>
          </div>
          <div>
            <div className={styles.proChartPairSymbol}>{pairSymbol}</div>
            <div className={styles.proChartPairPrice}>{lastPrice}</div>
          </div>
        </div>

        <div className={styles.proChartTimeframes}>
          {(["1H", "1D", "1W", "1M"] as Timeframe[]).map((t) => (
            <button
              key={t}
              className={
                timeframe === t
                  ? styles.proChartTfButtonActive ?? styles.proChartTfButton
                  : styles.proChartTfButton
              }
              onClick={() => setTimeframe(t)}
              type="button"
            >
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
        ) : !hasData ? (
          <span className={styles.proChartPlaceholderText}>
            No chart data for this pair yet
          </span>
        ) : (
          <ReactApexChart
            options={options}
            series={series}
            type="candlestick"
            height={260}
          />
        )}
      </div>
    </div>
  );
}
