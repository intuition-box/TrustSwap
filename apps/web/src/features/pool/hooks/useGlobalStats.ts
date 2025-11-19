import { useEffect, useState } from "react";
import type { Abi, Address } from "viem";
import { parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { addresses } from "@trustswap/sdk";
import * as SDKAbi from "@trustswap/sdk/abi";
import { useTokenModule } from "../../../hooks/useTokenModule";

function toAbi(x: unknown): Abi {
  return (Array.isArray(x) ? x : (x as any)?.abi) as Abi;
}
const UniFactoryAbi = toAbi(SDKAbi.UniswapV2Factory);
const UniPairAbi    = toAbi(SDKAbi.UniswapV2Pair);

const swapEvent = parseAbiItem(
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
);

type PairMeta = {
  pair: Address;
  t0: Address;
  t1: Address;
  r0: bigint;
  r1: bigint;
  wIs0?: boolean; // true si t0==WNATIVE, false si t1==WNATIVE, undefined sinon
};

export function useGlobalStats() {
  const pc = usePublicClient();
  const [data, setData] = useState<{ tvlWT: bigint; vol24hWT: bigint; tx24h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);
  const { WNATIVE_ADDRESS } = useTokenModule();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        if (!pc) {
          setErr("Public client is not defined.");
          setLoading(false);
          return;
        }

        const factory = addresses.UniswapV2Factory as Address;

        // 1) pairs
        const len = await pc.readContract({
          address: factory,
          abi: UniFactoryAbi,
          functionName: "allPairsLength",
        }) as bigint;

        const ids = Array.from({ length: Number(len) }, (_, i) => BigInt(i));
        const chunk = <T,>(a: T[], n = 300) =>
          a.reduce<T[][]>((acc, _, i) => (i % n ? acc : [...acc, a.slice(i, i + n)]), []);
        const idChunks = chunk(ids);

        const pairs: Address[] = [];
        for (const ch of idChunks) {
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

        // 2) token0/token1/getReserves pour toutes les paires
        const metaRaw = await pc.multicall({
          allowFailure: false,
          contracts: pairs.flatMap((p) => ([
            { address: p, abi: UniPairAbi, functionName: "token0" } as const,
            { address: p, abi: UniPairAbi, functionName: "token1" } as const,
            { address: p, abi: UniPairAbi, functionName: "getReserves" } as const,
          ])),
        });


        const w = WNATIVE_ADDRESS.toLowerCase();
        const metas: PairMeta[] = [];
        const pairIndex: Record<string, number> = {};

        // aide pour lire reserves sous 2 formes possibles
        const getR0R1 = (x: any): [bigint, bigint] =>
          Array.isArray(x) ? [x[0] as bigint, x[1] as bigint] : [x._reserve0 as bigint, x._reserve1 as bigint];

        for (let i = 0; i < pairs.length; i++) {
          const t0 = (metaRaw[i * 3 + 0] as Address);
          const t1 = (metaRaw[i * 3 + 1] as Address);
          const r   = metaRaw[i * 3 + 2] as any;
          const [r0, r1] = getR0R1(r);

          const t0l = t0.toLowerCase();
          const t1l = t1.toLowerCase();

          const wIs0 = t0l === w ? true : (t1l === w ? false : undefined);
          metas.push({ pair: pairs[i], t0, t1, r0, r1, wIs0 });
          pairIndex[pairs[i].toLowerCase()] = i;
        }

        // 3) Référence de prix en fraction bigints : priceRef[token] = rW / rT
        // (WNATIVE wei par plus petite unité du token)
        const priceRef: Record<string, { num: bigint; den: bigint }> = {};
        for (const m of metas) {
          const t0l = m.t0.toLowerCase();
          const t1l = m.t1.toLowerCase();
          if (m.wIs0 === true && m.r1 > 0n) {
            // WNATIVE = r0, token = r1
            priceRef[t1l] = { num: m.r0, den: m.r1 };
          } else if (m.wIs0 === false && m.r0 > 0n) {
            // token = r0, WNATIVE = r1
            priceRef[t0l] = { num: m.r1, den: m.r0 };
          }
        }

        // 4) TVL global en WNATIVE wei : somme des 2 côtés valorisés
        let tvlWT = 0n;
        for (const m of metas) {
          const t0l = m.t0.toLowerCase();
          const t1l = m.t1.toLowerCase();

          const v0 = t0l === w
            ? m.r0
            : (priceRef[t0l] ? (m.r0 * priceRef[t0l].num) / priceRef[t0l].den : 0n);

          const v1 = t1l === w
            ? m.r1
            : (priceRef[t1l] ? (m.r1 * priceRef[t1l].num) / priceRef[t1l].den : 0n);

          tvlWT += v0 + v1;
        }

        // 5) Fenêtre 24h ~ même méthode que sur la page pools
        const latestBlock = await pc.getBlock({ blockTag: "latest" });
        const back = latestBlock.number && latestBlock.number > 100n ? 100n : 0n;
        const prevBlock = back > 0n
          ? await pc.getBlock({ blockNumber: latestBlock.number - back })
          : latestBlock;

        const blockTimeSec = Number(latestBlock.timestamp - prevBlock.timestamp) / Number(back || 1n) || 5;
        const blocks24h = BigInt(Math.ceil(86_400 / blockTimeSec));
        const fromBlock = latestBlock.number > blocks24h ? latestBlock.number - blocks24h : 0n;

        // 6) Volume 24h global (single-side, toutes paires)
        let vol24hWT = 0n;
        let tx24h = 0;

        const addrChunks = chunk(pairs, 200);
        for (const addrs of addrChunks) {
          const logs = await pc.getLogs({
            address: addrs,
            event: swapEvent,
            fromBlock,
            toBlock: latestBlock.number,
          });

          for (const lg of logs) {
            const idx = pairIndex[lg.address.toLowerCase()];
            if (idx == null) continue;
            const m = metas[idx];

            const a0i = BigInt(lg.args?.amount0In ?? 0n);
            const a1i = BigInt(lg.args?.amount1In ?? 0n);
            const a0o = BigInt(lg.args?.amount0Out ?? 0n);
            const a1o = BigInt(lg.args?.amount1Out ?? 0n);

            // Préférence : côté "In"
            let side: 0 | 1 | null = null;
            if (a0i > 0n) side = 0;
            else if (a1i > 0n) side = 1;
            else if (a0o > 0n) side = 0; // fallback
            else if (a1o > 0n) side = 1; // fallback

            if (side === null) continue;

            let addWei: bigint = 0n;

            if (m.wIs0 === true || m.wIs0 === false) {
              // Paire WNATIVE : prendre la jambe WNATIVE
              const wAmt = m.wIs0 ? (a0i + a0o) : (a1i + a1o); // toujours en wei
              addWei = wAmt;
            } else {
              // Paire sans WNATIVE : convertir la jambe choisie via priceRef
              const tokenAddr = (side === 0 ? m.t0 : m.t1).toLowerCase();
              const amtIn = side === 0 ? (a0i > 0n ? a0i : a0o) : (a1i > 0n ? a1i : a1o);
              const ref = priceRef[tokenAddr];
              if (ref && ref.den > 0n && amtIn > 0n) {
                // conversion exacte en wei : amtIn * rW / rT
                addWei = (amtIn * ref.num) / ref.den;
              } else {
                addWei = 0n; // pas de prix dispo → on ignore
              }
            }

            vol24hWT += addWei;
            tx24h += 1;
          }
        }

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
