// apps/web/src/features/pools/hooks/usePairsVolume1D.ts
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem, formatUnits } from "viem";
import type { PoolItem } from "../types";
import { WNATIVE_ADDRESS } from "../../../lib/tokens";

const swapEvent = parseAbiItem(
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
);

// cache in-memory
const volCache = new Map<string, number>();
const CONCURRENCY = 12;

function key(pair: string, from: bigint, to: bigint) {
  return `${pair.toLowerCase()}:${from}:${to}`;
}

export function usePairsVolume1D(items: PoolItem[]) {
  const pc = usePublicClient({ chainId: 13579 });
  const [volMap, setVolMap] = useState<Record<string, number>>({});
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  // 🔑 clé stable quand la liste de paires change
  const pairsKey = useMemo(() => {
    if (!items?.length) return "none";
    // l’ordre importe peu → on trie pour éviter les changements non nécessaires
    return items.map((p) => (p.pair as string).toLowerCase()).sort().join(",");
  }, [items]);

  useEffect(() => {
    if (!pc || !items?.length) {
      setVolMap({});
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // 1) Prix spot rapides depuis réserves (priorité aux paires WTTRUST)
        const w = WNATIVE_ADDRESS.toLowerCase();
        const prices: Record<string, number> = { [w]: 1 };
        for (const p of items) {
          const a0 = p.token0.address.toLowerCase();
          const a1 = p.token1.address.toLowerCase();
          const r0 = Number(formatUnits(p.reserve0, p.token0.decimals));
          const r1 = Number(formatUnits(p.reserve1, p.token1.decimals));
          if (a0 === w && r1 > 0) prices[a1] = r0 / r1;
          if (a1 === w && r0 > 0) prices[a0] = r1 / r0;
        }
        if (cancelled) return;
        setPriceMap(prices);

        // 2) Fenêtre 24h dynamique
        const latest = await pc.getBlock({ blockTag: "latest" });
        const prev   = await pc.getBlock({ blockNumber: latest.number - 100n });
        const blockTime = Number(latest.timestamp - prev.timestamp) / 100 || 5; // sec
        const blocks24h = BigInt(Math.ceil(86_400 / blockTime));
        const fromBlock = latest.number > blocks24h ? latest.number - blocks24h : 0n;
        const toBlock   = latest.number;

        // 3) Métadonnées par paire
        const meta: Record<string, { dec0: number; dec1: number; p0: number; p1: number; wIs0?: boolean }> = {};
        for (const p of items) {
          const k = (p.pair as string).toLowerCase();
          const a0 = p.token0.address.toLowerCase();
          const a1 = p.token1.address.toLowerCase();
          meta[k] = {
            dec0: p.token0.decimals,
            dec1: p.token1.decimals,
            p0: prices[a0] ?? (a0 === w ? 1 : 0),
            p1: prices[a1] ?? (a1 === w ? 1 : 0),
            wIs0: a0 === w ? true : a1 === w ? false : undefined,
          };
        }

        // 4) Process en 2 vagues (WTTRUST d’abord), concurrence limitée + updates progressifs
        const wtPairs = items
          .filter(p => p.token0.address.toLowerCase() === w || p.token1.address.toLowerCase() === w)
          .map(p => p.pair as `0x${string}`);
        const otherPairs = items
          .filter(p => p.token0.address.toLowerCase() !== w && p.token1.address.toLowerCase() !== w)
          .map(p => p.pair as `0x${string}`);

        const out: Record<string, number> = {};
        async function processPairs(pairs: `0x${string}`[]) {
          let i = 0;
          async function worker() {
            while (!cancelled && i < pairs.length) {
              const pair = pairs[i++];
              const addrLower = pair.toLowerCase();
              const ck = key(addrLower, fromBlock, toBlock);

              if (volCache.has(ck)) {
                out[addrLower] = (out[addrLower] || 0) + (volCache.get(ck) as number);
                // update progressif
                setVolMap({ ...out });
                continue;
              }

              try {
                const logs = await pc.getLogs({
                  address: pair,
                  event: swapEvent,
                  fromBlock,
                  toBlock,
                });
                let volWT = 0;
                const m = meta[addrLower];

                for (const lg of logs) {
                  const a0i = (lg.args?.amount0In ?? 0n) as bigint;
                  const a1i = (lg.args?.amount1In ?? 0n) as bigint;
                  const a0o = (lg.args?.amount0Out ?? 0n) as bigint;
                  const a1o = (lg.args?.amount1Out ?? 0n) as bigint;

                  if (m.wIs0 !== undefined) {
                    const wt = m.wIs0 ? a0i + a0o : a1i + a1o;
                    volWT += Number(formatUnits(wt, 18));
                  } else {
                    if (a0i > 0n) volWT += Number(formatUnits(a0i, m.dec0)) * (m.p0 || 0);
                    else if (a1i > 0n) volWT += Number(formatUnits(a1i, m.dec1)) * (m.p1 || 0);
                    else {
                      if (a0o > 0n) volWT += Number(formatUnits(a0o, m.dec0)) * (m.p0 || 0);
                      if (a1o > 0n) volWT += Number(formatUnits(a1o, m.dec1)) * (m.p1 || 0);
                    }
                  }
                }

                volCache.set(ck, volWT);
                out[addrLower] = (out[addrLower] || 0) + volWT;
                // update progressif
                if (!cancelled) setVolMap({ ...out });
              } catch {
                // ignore unitaire si erreur RPC
              }
            }
          }
          await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
        }

        await processPairs(wtPairs);
        if (!cancelled) setVolMap(prev => ({ ...prev, ...out }));

        await processPairs(otherPairs);
        if (!cancelled) setVolMap(prev => ({ ...prev, ...out }));
      } catch (e) {
        if (!cancelled) {
          console.error("usePairsVolume1D error", e);
          setVolMap({});
        }
      }
    })();

    return () => { cancelled = true; };
  // 🔁 relance quand le client est prêt ou que la liste des paires change
  }, [pc, pairsKey]);

  return { volMap, priceMap };
}
