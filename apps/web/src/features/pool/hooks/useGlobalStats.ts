import { useEffect, useState } from "react";
import type { Abi, Address } from "viem";
import { parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { addresses } from "@trustswap/sdk";
import * as SDKAbi from "@trustswap/sdk/abi"; 
import { WNATIVE_ADDRESS } from "../../../lib/tokens";

function toAbi(x: unknown): Abi {
  return (Array.isArray(x) ? x : (x as any)?.abi) as Abi;
}
const UniFactoryAbi = toAbi(SDKAbi.UniswapV2Factory);
const UniPairAbi    = toAbi(SDKAbi.UniswapV2Pair);

const swapEvent = parseAbiItem(
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
);

export function useGlobalStats() {
  const pc = usePublicClient();
  const [data, setData] = useState<{ tvlWT: bigint; vol24hWT: bigint; tx24h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);
 
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
 
        if (!pc) {
          setErr("Public client is not defined.");
          console.log("[useGlobalStats] no public client");
          setLoading(false);
          return;
        }
 
        const factory = addresses.UniswapV2Factory as Address;
        console.log("[useGlobalStats] start", {
          chainId: pc?.chain?.id, factory, multicall3: pc?.chain?.contracts?.multicall3
        });
 
        // allPairsLength → bigint
        const len = await pc.readContract({
          address: factory,
          abi: UniFactoryAbi,
          functionName: "allPairsLength",
        }) as bigint;
        console.log("[useGlobalStats] total pairs", len?.toString());
 
        const ids = Array.from({ length: Number(len) }, (_, i) => BigInt(i));
        const chunk = <T,>(a: T[], n = 300) => a.reduce<T[][]>((acc, _, i) => (i % n ? acc : [...acc, a.slice(i, i + n)]), []);
        const idChunks = chunk(ids);
 
        // 1) pairs
        const pairs: Address[] = [];
        for (const ch of idChunks) {
          console.log("[useGlobalStats] fetch pairs chunk", ch.length);
          const res = await pc.multicall({
            allowFailure: false,
            contracts: ch.map((i) => ({
              address: factory,
              abi: UniFactoryAbi,
              functionName: "allPairs",
              args: [i],
            })),
          });
          pairs.push(...(res as Address[]));
        }
        console.log("[useGlobalStats] pairs length", pairs.length);
 
        // 2) token0/token1/getReserves
        const meta = await pc.multicall({
          allowFailure: false,
          contracts: pairs.flatMap((p) => ([
            { address: p, abi: UniPairAbi, functionName: "token0" } as const,
            { address: p, abi: UniPairAbi, functionName: "token1" } as const,
            { address: p, abi: UniPairAbi, functionName: "getReserves" } as const,
          ])),
        });
        console.log("[useGlobalStats] meta entries", meta.length);
 
        let tvlWT = 0n;
        let vol24hWT = 0n;
        let tx24h = 0;
 
        const wtPairs: Address[] = [];
        const isWT0: Record<string, boolean> = {};

        // ⚠️ selon l’ABI, getReserves peut revenir en tuple [r0, r1, ts] ou en objet { _reserve0, _reserve1, ... }.
        const getR0R1 = (x: any): [bigint, bigint] =>
          Array.isArray(x) ? [x[0] as bigint, x[1] as bigint] : [x._reserve0 as bigint, x._reserve1 as bigint];

        for (let i = 0; i < pairs.length; i++) {
          const t0 = meta[i * 3 + 0] as Address;
          const t1 = meta[i * 3 + 1] as Address;
          const reserves = meta[i * 3 + 2] as any;
          const [r0, r1] = getR0R1(reserves);

          if (t0.toLowerCase() === WNATIVE_ADDRESS.toLowerCase()) {
            wtPairs.push(pairs[i]);
            isWT0[pairs[i].toLowerCase()] = true;
            tvlWT += 2n * r0;
          } else if (t1.toLowerCase() === WNATIVE_ADDRESS.toLowerCase()) {
            wtPairs.push(pairs[i]);
            isWT0[pairs[i].toLowerCase()] = false;
            tvlWT += 2n * r1;
          }
        }
        console.log("[useGlobalStats] wtPairs", wtPairs.length, "tvlWT", tvlWT.toString());
 
        // 3) Volume & TX 24h (logs Swap)
        if (wtPairs.length) {
          const latest = await pc.getBlockNumber(); // bigint
          const span = 17280n;                      // bigint (~24h à 5s/bloc)
          const fromBlock = latest > span ? (latest - span) : 0n;
          console.log("[useGlobalStats] logs window", { from: fromBlock.toString(), to: latest.toString() });
 
          const addrChunks = chunk(wtPairs, 200);
          for (const addrs of addrChunks) {
            console.log("[useGlobalStats] fetch logs for", addrs.length, "pairs");
            const logs = await pc.getLogs({
              address: addrs,
              event: swapEvent,
              fromBlock,
              toBlock: latest,
            });
            console.log("[useGlobalStats] logs received", logs.length);
 
            for (const { address, args } of logs) {
              const wtIs0 = isWT0[address.toLowerCase()];
              // sécurise en bigint explicite
              const a0i = BigInt(args?.amount0In ?? 0n);
              const a1i = BigInt(args?.amount1In ?? 0n);
              const a0o = BigInt(args?.amount0Out ?? 0n);
              const a1o = BigInt(args?.amount1Out ?? 0n);

              const wtFlow = wtIs0 ? (a0i + a0o) : (a1i + a1o);
              vol24hWT += wtFlow;
              tx24h += 1;
            }
          }
        }
 
        console.log("[useGlobalStats] done", { tvlWT: tvlWT.toString(), vol24hWT: vol24hWT.toString(), tx24h });
        setData({ tvlWT, vol24hWT, tx24h });
        setErr(null);
      } catch (e: any) {
        console.error("[useGlobalStats] error", e);
        setErr(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [pc]);
 
  return { data, loading, error };
}
