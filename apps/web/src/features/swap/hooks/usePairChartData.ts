// usePairChartData.ts
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { graphqlRequest } from "../../../lib/indexerClient";
type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PairChartData = {
  candles: Candle[];
  lastPrice: string;
};

const SWAPS_FOR_CHART_QUERY = `
  query SwapsForChart($pair: String!, $limit: Int!) {
    Swap(
      where: { pairAddress: { _ilike: $pair } }
      order_by: { blockTimestamp: desc }
      limit: $limit
    ) {
      amount0In
      amount1In
      amount0Out
      amount1Out
      blockTimestamp
    }
  }
`;

type SwapsForChartResponse = {
  Swap: {
    amount0In: string;
    amount1In: string;
    amount0Out: string;
    amount1Out: string;
    blockTimestamp: string;
  }[];
};

export function usePairChartData(pairAddress: Address | null) {
  const [data, setData] = useState<PairChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pairAddress) {
      setData(null);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await graphqlRequest<
          SwapsForChartResponse,
          { pair: string; limit: number }
        >({
          query: SWAPS_FOR_CHART_QUERY,
          variables: {
            pair: pairAddress.toLowerCase(),
            limit: 200,
          },
        });

        if (cancelled) return;

        const swaps = res.Swap
          .map((s) => {
            const ts = Number(s.blockTimestamp);
            const a0In = Number(s.amount0In);
            const a1In = Number(s.amount1In);
            const a0Out = Number(s.amount0Out);
            const a1Out = Number(s.amount1Out);

            let price: number | null = null;
            if (a0In > 0 && a1Out > 0) {
              price = a1Out / a0In;
            } else if (a1In > 0 && a0Out > 0) {
              price = a0Out / a1In;
            }

            return { ts, price };
          })
          .filter((s) => s.price !== null) as { ts: number; price: number }[];

        if (swaps.length === 0) {
          setData({
            candles: [],
            lastPrice: "-",
          });
          return;
        }

        const bucketSizeSec = 5 * 60;
        const buckets = new Map<number, number[]>();

        for (const s of swaps) {
          const bucket = Math.floor(s.ts / bucketSizeSec) * bucketSizeSec;
          const arr = buckets.get(bucket) ?? [];
          arr.push(s.price);
          buckets.set(bucket, arr);
        }

        const candles: Candle[] = Array.from(buckets.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([bucketTs, prices]) => {
            const open = prices[0];
            const close = prices[prices.length - 1];
            const high = Math.max(...prices);
            const low = Math.min(...prices);
            return {
              timestamp: bucketTs,
              open,
              high,
              low,
              close,
              volume: prices.length,
            };
          });

        const last = candles[candles.length - 1];

        setData({
          candles,
          lastPrice: last.close.toString(),
        });
      } catch (err) {
        console.error("Failed to fetch pair chart data", err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [pairAddress]);

  return { data, isLoading };
}