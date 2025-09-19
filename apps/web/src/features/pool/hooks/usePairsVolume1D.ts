// apps/web/src/features/pools/hooks/usePairsVolume1D.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { parseAbiItem, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { WNATIVE_ADDRESS } from "../../../lib/tokens";
import type { PoolItem } from "../types"; // Adjust the path if PoolItem is defined elsewhere

const swapEvent = parseAbiItem(
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
);

export function usePairsVolume1D(items: PoolItem[]) {
  const pc = usePublicClient({ chainId: 13579 });
  const [volMap, setVolMap] = useState<Record<string, number>>({});
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const runIdRef = useRef(0);

  // 🔑 clé stable quand les paires changent
  const pairsKey = useMemo(() => {
    if (!items?.length) return "none";
    return items.map(p => (p.pair as string).toLowerCase()).sort().join(",");
  }, [items]);

  useEffect(() => {
    if (!pc || !items?.length) {
      setVolMap({});
      setPriceMap({});
      return;
    }

    const runId = ++runIdRef.current;
    let cancelled = false;

    (async () => {
      try {
        const w = WNATIVE_ADDRESS.toLowerCase();

        // 1) prix spot via réserves sur les paires WNATIVE
        const prices: Record<string, number> = { [w]: 1 };
        for (const p of items) {
          const a0 = p.token0.address.toLowerCase();
          const a1 = p.token1.address.toLowerCase();
          const r0 = Number(formatUnits(p.reserve0, p.token0.decimals));
          const r1 = Number(formatUnits(p.reserve1, p.token1.decimals));
          if (a0 === w && r1 > 0) prices[a1] = r0 / r1;
          if (a1 === w && r0 > 0) prices[a0] = r1 / r0;
        }
        if (cancelled || runId !== runIdRef.current) return;
        setPriceMap(prices);

        // 2) fenêtre 24h estimée dynamiquement
        const latest = await pc.getBlock({ blockTag: "latest" });
        const back = latest.number && latest.number > 100n ? 100n : 0n;
        const prev = back > 0n ? await pc.getBlock({ blockNumber: latest.number - back }) : latest;
        const blockTime = Number(latest.timestamp - prev.timestamp) / Number(back || 1n) || 5;
        const blocks24h = BigInt(Math.ceil(86_400 / blockTime));
        const fromBlock = latest.number > blocks24h ? latest.number - blocks24h : 0n;
        console.log("[usePairsVolume1D] blocks", {
          latest: latest.number?.toString(),
          from: fromBlock.toString(),
          estBlockTime: blockTime,
        });

        // 3) logs par groupes
        const pairs = items.map(p => (p.pair as `0x${string}`));
        const vol: Record<string, number> = {};
        const chunk = <T,>(arr: T[], n = 200) =>
          arr.reduce<T[][]>((acc, _, i) => (i % n ? acc : [...acc, arr.slice(i, i + n)]), []);

        for (const grp of chunk(pairs, 200)) {
          const logs = await pc.getLogs({
            address: grp,
            event: swapEvent,
            fromBlock,
            toBlock: latest.number,
          });

          for (const lg of logs) {
            const key = lg.address.toLowerCase();
            const p = items.find(x => (x.pair as string).toLowerCase() === key);
            if (!p) continue;

            const a0i = BigInt(lg.args?.amount0In ?? 0n);
            const a1i = BigInt(lg.args?.amount1In ?? 0n);
            const a0o = BigInt(lg.args?.amount0Out ?? 0n);
            const a1o = BigInt(lg.args?.amount1Out ?? 0n);

            const a0Addr = p.token0.address.toLowerCase();
            const a1Addr = p.token1.address.toLowerCase();

            // un seul côté par token
            const traded0 = a0i + a0o;
            const traded1 = a1i + a1o;

            let tradeWT = 0;
            const wIs0 = a0Addr === w ? true : a1Addr === w ? false : undefined;

            if (wIs0 !== undefined) {
              // Paire avec WNATIVE → ne prendre QUE le côté WNATIVE
              const wDec = wIs0 ? p.token0.decimals : p.token1.decimals;
              const wAmt = wIs0 ? traded0 : traded1;
              tradeWT = Number(formatUnits(wAmt, wDec));
            } else {
              // Paire sans WNATIVE → valoriser UN seul côté (celui non-nul) via prix spot
              const p0 = prices[a0Addr] ?? 0;
              const p1 = prices[a1Addr] ?? 0;

              if (traded0 > 0n && p0 > 0) {
                tradeWT = Number(formatUnits(traded0, p.token0.decimals)) * p0;
              } else if (traded1 > 0n && p1 > 0) {
                tradeWT = Number(formatUnits(traded1, p.token1.decimals)) * p1;
              } else {
                tradeWT = 0;
              }
            }

            if (!Number.isFinite(tradeWT)) tradeWT = 0;
            vol[key] = (vol[key] || 0) + tradeWT;
          }
        }

        if (!cancelled && runId === runIdRef.current) {
          // dump debug: top paires par volume
          const dump = Object.entries(vol)
            .map(([addr, v]) => {
              const it = items.find(x => (x.pair as string).toLowerCase() === addr);
              const label = it ? `${it.token0.symbol}/${it.token1.symbol}` : addr;
              return { addr, label, v };
            })
            .sort((a, b) => b.v - a.v)
            .slice(0, 10);
          console.log("[usePairsVolume1D] volMap size", Object.keys(vol).length);
          setVolMap(vol);
        }
      } catch (e) {
        if (!cancelled && runId === runIdRef.current) {
          console.error("usePairsVolume1D error", e);
          setVolMap({});
        }
      }
    })();

    return () => { cancelled = true; };
  }, [pc, pairsKey]);

  return { volMap, priceMap };
}
