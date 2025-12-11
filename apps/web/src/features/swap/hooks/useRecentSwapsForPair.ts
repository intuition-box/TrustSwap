// useRecentSwapsForPair.ts
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { graphqlRequest } from "../../../lib/indexerClient";
import { useTokenModule } from "../../../hooks/useTokenModule";
import { useImportedTokens } from "../hooks/useImportedTokens";
import { usePublicClient } from "wagmi";
import { erc20Abi } from "viem";

type RecentSwapRow = {
  id: string;
  timeLabel: string;
  side: "buy" | "sell";
  amountInRaw: string;
  amountOutRaw: string;
  inSymbol: string;
  outSymbol: string;
  inDecimals: number;
  outDecimals: number;
  wallet: string;
  txHash: string;
  chainId: string;
};

const RECENT_SWAPS_QUERY = `
  query RecentSwaps($pair: String!, $limit: Int!) {
    Pair(
      where: { pairAddress: { _ilike: $pair } }
      limit: 1
    ) {
      token0
      token1
    }
    Swap(
      where: { pairAddress: { _ilike: $pair } }
      order_by: { blockTimestamp: desc }
      limit: $limit
    ) {
      id
      sender
      amount0In
      amount1In
      amount0Out
      amount1Out
      blockTimestamp
      pairAddress
      createdAtTx
      chainId
      to
    }
  }
`;

type RecentSwapsResponse = {
  Pair: {
    token0: string;
    token1: string;
  }[];
  Swap: {
    id: string;
    sender: string;
    amount0In: string;
    amount1In: string;
    amount0Out: string;
    amount1Out: string;
    blockTimestamp: string;
    pairAddress: string;
    createdAtTx: string;
    chainId: string;
    to: string;
  }[];
};

const FALLBACK_DECIMALS = 18;

type SimpleMeta = {
  symbol: string;
  decimals: number;
};

function formatDateTime(ts: string): string {
  const n = Number(ts);
  if (!Number.isFinite(n)) return ts;
  const d = new Date(n * 1000);
  return d.toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const norm = (a?: string | null) =>
  typeof a === "string" ? a.toLowerCase() : "";

export function useRecentSwapsForPair(pairAddress: Address | null) {
  const { TOKENLIST } = useTokenModule();
  const { tokens: imported } = useImportedTokens();
  const pc = usePublicClient();

  const [data, setData] = useState<RecentSwapRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Local cache for token metadata (address -> meta)
  const [metaCache, setMetaCache] = useState<Record<string, SimpleMeta>>({});

  function cacheMeta(addr: string, meta: SimpleMeta) {
    setMetaCache((prev) => {
      const key = norm(addr);
      if (prev[key]) return prev;
      return { ...prev, [key]: meta };
    });
  }

  function findLocalMeta(addr: string): SimpleMeta | null {
    const lower = norm(addr);
    const cached = metaCache[lower];
    if (cached) return cached;

    const all = [
      ...(TOKENLIST as any[]),
      ...((imported ?? []) as any[]),
    ];

    for (const t of all) {
      if (!t?.address) continue;
      if (norm(t.address) === lower) {
        const symbol: string =
          typeof t.symbol === "string" && t.symbol.length > 0
            ? t.symbol
            : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
        const decimals: number =
          typeof t.decimals === "number" ? t.decimals : FALLBACK_DECIMALS;

        const meta = { symbol, decimals };
        cacheMeta(addr, meta);
        return meta;
      }
    }

    return null;
  }

  async function fetchOnchainMeta(addr: string): Promise<SimpleMeta> {
    const lower = norm(addr);
    const cached = metaCache[lower];
    if (cached) return cached;

    // Try local TOKENLIST/imported first
    const local = findLocalMeta(addr);
    if (local) return local;

    if (!pc) {
      const fallback: SimpleMeta = {
        symbol: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
        decimals: FALLBACK_DECIMALS,
      };
      cacheMeta(addr, fallback);
      return fallback;
    }

    let symbol = "";
    let decimals: number = FALLBACK_DECIMALS;

    try {
      const [s, d] = await Promise.all([
        pc.readContract({
          address: addr as Address,
          abi: erc20Abi,
          functionName: "symbol",
        }),
        pc.readContract({
          address: addr as Address,
          abi: erc20Abi,
          functionName: "decimals",
        }),
      ]);

      if (typeof s === "string" && s.length > 0) {
        symbol = s;
      }
      if (typeof d === "number") {
        decimals = d;
      }
    } catch (e) {
      // Fallback if onchain read fails
    }

    if (!symbol) {
      symbol = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    }

    const meta = { symbol, decimals };
    cacheMeta(addr, meta);
    return meta;
  }

  useEffect(() => {
    if (!pairAddress) {
      setData([]);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      if (!pairAddress) return;
      
      setIsLoading(true);
      try {
        const res = await graphqlRequest<
          RecentSwapsResponse,
          { pair: string; limit: number }
        >({
          query: RECENT_SWAPS_QUERY,
          variables: {
            pair: pairAddress.toLowerCase(),
            limit: 30,
          },
        });

        if (cancelled) return;

        const pairRow = res.Pair[0];

        let token0Addr: string | null = null;
        let token1Addr: string | null = null;

        if (pairRow) {
          token0Addr = pairRow.token0 ?? null;
          token1Addr = pairRow.token1 ?? null;
        }

        // Resolve metadata for token0 / token1 (local first, then onchain)
        let token0Meta: SimpleMeta = {
          symbol: "token0",
          decimals: FALLBACK_DECIMALS,
        };
        let token1Meta: SimpleMeta = {
          symbol: "token1",
          decimals: FALLBACK_DECIMALS,
        };

        if (token0Addr) {
          token0Meta = await fetchOnchainMeta(token0Addr);
        }
        if (token1Addr) {
          token1Meta = await fetchOnchainMeta(token1Addr);
        }

        const token0Symbol = token0Meta.symbol;
        const token1Symbol = token1Meta.symbol;
        const token0Decimals = token0Meta.decimals;
        const token1Decimals = token1Meta.decimals;

        const rows: RecentSwapRow[] = res.Swap.map((s) => {
          const a0In = BigInt(s.amount0In);
          const a1In = BigInt(s.amount1In);
          const a0Out = BigInt(s.amount0Out);
          const a1Out = BigInt(s.amount1Out);

          let side: "buy" | "sell" = "buy";

          let amountInRaw = "0";
          let amountOutRaw = "0";
          let inSymbol = token0Symbol;
          let outSymbol = token1Symbol;
          let inDecimals = token0Decimals;
          let outDecimals = token1Decimals;

          if (a0In > 0n && a1Out > 0n) {
            // In: token0, Out: token1
            side = "sell";
            amountInRaw = s.amount0In;
            amountOutRaw = s.amount1Out;
            inSymbol = token0Symbol;
            outSymbol = token1Symbol;
            inDecimals = token0Decimals;
            outDecimals = token1Decimals;
          } else if (a1In > 0n && a0Out > 0n) {
            // In: token1, Out: token0
            side = "buy";
            amountInRaw = s.amount1In;
            amountOutRaw = s.amount0Out;
            inSymbol = token1Symbol;
            outSymbol = token0Symbol;
            inDecimals = token1Decimals;
            outDecimals = token0Decimals;
          } else {
            // Fallback
            side = "sell";
            amountInRaw = s.amount0In;
            amountOutRaw = s.amount1Out;
            inSymbol = token0Symbol;
            outSymbol = token1Symbol;
            inDecimals = token0Decimals;
            outDecimals = token1Decimals;
          }

          return {
            id: s.id,
            timeLabel: formatDateTime(s.blockTimestamp),
            side,
            amountInRaw,
            amountOutRaw,
            inSymbol,
            outSymbol,
            inDecimals,
            outDecimals,
            wallet: s.to,
            txHash: s.createdAtTx,
            chainId: s.chainId,
          };
        });

        if (!cancelled) {
          setData(rows);
        }
      } catch (err) {
        console.error("Failed to fetch recent swaps", err);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [pairAddress, TOKENLIST, imported, pc, metaCache]);

  return { data, isLoading };
}
