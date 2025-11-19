import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { abi, addresses } from "@trustswap/sdk";
import { useTokenModule } from "../../../hooks/useTokenModule";

type TokenInfoLite = {
  address?: Address;   // undefined => native
  symbol: string;
  decimals: number;
  name?: string;
};

export type TokenHolding = {
  token: TokenInfoLite;
  balance: bigint;          // raw
  balanceFormatted: string; // human
};

export type PoolPosition = {
  pairAddress: Address;
  token0: TokenInfoLite;
  token1: TokenInfoLite;
  lpBalance: bigint;
  lpBalanceFormatted: string;
  sharePct: number;
  amount0: bigint;
  amount1: bigint;
  amount0Formatted: string;
  amount1Formatted: string;
};

const toAbi = (x: unknown) => (Array.isArray(x) ? x : (x as any)?.abi) as any;
const FACTORY_ABI = toAbi(abi.UniswapV2Factory);
const PAIR_ABI    = toAbi(abi.UniswapV2Pair);

export function usePortfolio() {
  const { address: account } = useAccount();
  const pc = usePublicClient();
  const [holdings, setHoldings] = useState<TokenHolding[] | null>(null);
  const [positions, setPositions] = useState<PoolPosition[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { TOKENLIST, toUIList, getOrFetchToken, NATIVE_PLACEHOLDER, isNative } = useTokenModule();

  // Build UI token list: start from TOKENLIST and hide items flagged as hidden
  const uiTokenList = useMemo(() => toUIList(TOKENLIST), []);

  useEffect(() => {
    if (!pc || !account) return;
    let cancelled = false;

    async function run() {
      try {
        if (!pc) return;
        setLoading(true);
        setError(null);

        // --- 1) Token holdings (native + ERC20 in TOKENLIST) ---
        // Native (placeholder in TOKENLIST has isNative=true)
        const nativeEntry = TOKENLIST.find(t => t.isNative);
        if (!account) throw new Error("Account address is undefined");
        const nativeBal = await pc.getBalance({ address: account });

        const baseHoldings: TokenHolding[] = [
          {
            token: {
              // no on-chain address for native; keep undefined
              symbol: nativeEntry?.symbol ?? "tTRUST",
              decimals: nativeEntry?.decimals ?? 18,
              name: nativeEntry?.name,
            },
            balance: nativeBal,
            balanceFormatted: formatUnits(nativeBal, nativeEntry?.decimals ?? 18),
          },
        ];

        // ERC20 balances for UI tokens (exclude native placeholder)
        const erc20List = uiTokenList.filter(t => t.address.toLowerCase() !== NATIVE_PLACEHOLDER.toLowerCase());
        const erc20Calls = erc20List.map((t) => ({
          address: t.address as Address,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [account],
        }));
        const erc20Res = erc20Calls.length ? await pc.multicall({ contracts: erc20Calls }) : [];

        erc20Res.forEach((r, i) => {
          const meta = erc20List[i];
          const bal = r.status === "success" ? (r.result as bigint) : 0n;
          baseHoldings.push({
            token: { address: meta.address as Address, symbol: meta.symbol, decimals: meta.decimals, name: meta.name },
            balance: bal,
            balanceFormatted: formatUnits(bal, meta.decimals),
          });
        });

        // Keep native even if zero; filter out zero ERC20s
        const nonZero = baseHoldings.filter(h => h.balance > 0n || !h.token.address);

        // --- 2) Pool positions (scan recent pairs from factory) ---
        const factory = addresses.UniswapV2Factory as Address;
        const len = (await pc.readContract({
          address: factory,
          abi: FACTORY_ABI,
          functionName: "allPairsLength",
          args: [],
        })) as bigint;

        const MAX_SCAN = 1000n; // adjust to your DEX size
        const scanLen = len > MAX_SCAN ? MAX_SCAN : len;
        const start = len - scanLen;

        const pairIdxCalls = Array.from({ length: Number(scanLen) }, (_, k) => ({
          address: factory,
          abi: FACTORY_ABI,
          functionName: "allPairs" as const,
          args: [start + BigInt(k)],
        }));
        const pairIdxRes = await pc.multicall({ contracts: pairIdxCalls });
        const pairAddresses = pairIdxRes
          .map(r => (r.status === "success" ? (r.result as Address) : null))
          .filter(Boolean) as Address[];

        if (pairAddresses.length === 0) {
          if (!cancelled) {
            setHoldings(
              nonZero.sort((a, b) => (a.balance === b.balance ? 0 : a.balance < b.balance ? 1 : -1))
            );
            setPositions([]);
            setLoading(false);
          }
          return;
        }

        const lpBalanceCalls = pairAddresses.map((addr) => ({
          address: addr,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [account],
        }));
        const totalSupplyCalls = pairAddresses.map((addr) => ({
          address: addr,
          abi: erc20Abi,
          functionName: "totalSupply" as const,
          args: [],
        }));
        const token0Calls = pairAddresses.map((addr) => ({
          address: addr,
          abi: PAIR_ABI,
          functionName: "token0" as const,
          args: [],
        }));
        const token1Calls = pairAddresses.map((addr) => ({
          address: addr,
          abi: PAIR_ABI,
          functionName: "token1" as const,
          args: [],
        }));
        const reservesCalls = pairAddresses.map((addr) => ({
          address: addr,
          abi: PAIR_ABI,
          functionName: "getReserves" as const,
          args: [],
        }));

        const [balRes, tsRes, t0Res, t1Res, rsvRes] = await Promise.all([
          pc.multicall({ contracts: lpBalanceCalls }),
          pc.multicall({ contracts: totalSupplyCalls }),
          pc.multicall({ contracts: token0Calls }),
          pc.multicall({ contracts: token1Calls }),
          pc.multicall({ contracts: reservesCalls }),
        ]);

        const out: PoolPosition[] = [];
        for (let i = 0; i < pairAddresses.length; i++) {
          const ok =
            balRes[i]?.status === "success" &&
            tsRes[i]?.status === "success" &&
            t0Res[i]?.status === "success" &&
            t1Res[i]?.status === "success" &&
            rsvRes[i]?.status === "success";
          if (!ok) continue;

          const lpBal = balRes[i].result as bigint;
          if (lpBal === 0n) continue;

          const totalSupply = tsRes[i].result as bigint;
          const token0Addr = t0Res[i].result as Address;
          const token1Addr = t1Res[i].result as Address;

          // Parse reserves as tuple: [reserve0, reserve1, blockTimestampLast]
          const [reserve0, reserve1] = rsvRes[i].result as readonly [bigint, bigint, number];

          // Guard against zero totalSupply
          if (totalSupply === 0n) continue;

          // Map WTTRUST -> native placeholder for UI, fetch meta safely
          const [t0Meta, t1Meta] = await Promise.all([
            getOrFetchToken(isNative(token0Addr) ? NATIVE_PLACEHOLDER : token0Addr),
            getOrFetchToken(isNative(token1Addr) ? NATIVE_PLACEHOLDER : token1Addr),
          ]);

          // All-bigint math first
          const amt0 = (reserve0 * lpBal) / totalSupply; // bigint
          const amt1 = (reserve1 * lpBal) / totalSupply; // bigint

          // sharePct as number with 2 decimals (basis points / 100)
          const sharePct = Number((lpBal * 10000n) / totalSupply) / 100;

          out.push({
            pairAddress: pairAddresses[i],
            token0: { address: t0Meta.address, symbol: t0Meta.symbol, decimals: t0Meta.decimals, name: t0Meta.name },
            token1: { address: t1Meta.address, symbol: t1Meta.symbol, decimals: t1Meta.decimals, name: t1Meta.name },
            lpBalance: lpBal,
            lpBalanceFormatted: formatUnits(lpBal, 18),
            sharePct,
            amount0: amt0,
            amount1: amt1,
            amount0Formatted: formatUnits(amt0, t0Meta.decimals),
            amount1Formatted: formatUnits(amt1, t1Meta.decimals),
          });
        }

        if (!cancelled) {
          setHoldings(nonZero.sort((a, b) => (a.balance === b.balance ? 0 : a.balance < b.balance ? 1 : -1)));
          setPositions(out);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Portfolio error");
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [pc, account, uiTokenList]);

  return { holdings, positions, loading, error };
}
