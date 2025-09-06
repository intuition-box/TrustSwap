// features/pools/hooks/usePairsVolume1D.ts
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import {
  createPublicClient,
  http,
  formatUnits,
  parseAbiItem,
  zeroAddress,
  erc20Abi,
} from "viem";
import { INTUITION, addresses, abi } from "@trustswap/sdk";

const SWAP_EVENT = parseAbiItem(
  "event Swap(address indexed sender,uint amount0In,uint amount1In,uint amount0Out,uint amount1Out,address indexed to)"
);

// Estimation blocs sur 24h (ajuste selon ton réseau)
const AVG_BLOCK_TIME_SEC = 3;
const BLOCKS_24H = Math.floor(86400 / AVG_BLOCK_TIME_SEC);

type PairLite = {
  pair: Address;
  token0: { address: Address; decimals: number };
  token1: { address: Address; decimals: number };
};

export function usePairsVolume1D(pairs: PairLite[]) {
  const [volMap, setVolMap] = useState<Record<string, number>>({});
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  // ✅ clé de dépendance sans bigint
  const depKey = useMemo(
    () =>
      pairs
        .map(
          (p) =>
            `${p.pair.toLowerCase()}|${p.token0.address.toLowerCase()}:${p.token0.decimals}|${p.token1.address.toLowerCase()}:${p.token1.decimals}`
        )
        .join(","),
    [pairs]
  );

  useEffect(() => {
    if (!pairs.length) {
      setVolMap({});
      setPriceMap({});
      return;
    }

    (async () => {
      const client = createPublicClient({
        chain: INTUITION,
        transport: http(INTUITION.rpcUrls.default.http[0]),
      });
      const latest = await client.getBlockNumber();
      const fromBlock =
        latest > BigInt(BLOCKS_24H) ? latest - BigInt(BLOCKS_24H) : 0n;

      // 1) Prix token → tTRUST (via pair {token, WTTRUST})
      const tokenSet = new Set<string>();
      for (const p of pairs) {
        tokenSet.add(p.token0.address.toLowerCase());
        tokenSet.add(p.token1.address.toLowerCase());
      }
      const prices = await buildNativePrices(
        [...tokenSet] as Address[],
        client
      );
      setPriceMap(prices);

      // 2) Volume 24h par pair
      const out: Record<string, number> = {};
      for (const p of pairs) {
        try {
          const logs = await client.getLogs({
            address: p.pair,
            event: SWAP_EVENT,
            fromBlock,
            toBlock: latest,
          });

          const p0 = prices[p.token0.address.toLowerCase()] ?? 0;
          const p1 = prices[p.token1.address.toLowerCase()] ?? 0;

          let vol = 0;
          for (const log of logs) {
            const { amount0In, amount1In, amount0Out, amount1Out } =
              log.args as any;
            const in0 = Number(
              formatUnits(amount0In as bigint, p.token0.decimals)
            ) * p0;
            const in1 = Number(
              formatUnits(amount1In as bigint, p.token1.decimals)
            ) * p1;
            const out0 = Number(
              formatUnits(amount0Out as bigint, p.token0.decimals)
            ) * p0;
            const out1 = Number(
              formatUnits(amount1Out as bigint, p.token1.decimals)
            ) * p1;
            vol += Math.max(in0 + in1, out0 + out1);
          }
          out[p.pair.toLowerCase()] = vol;
        } catch {
          // ignore
        }
      }
      setVolMap(out);
    })();
  }, [depKey]);

  return { volMap, priceMap };
}

/**
 * Construit une table de prix token→tTRUST en s'appuyant sur la pool {token, WTTRUST}.
 * Si pas de pool, le prix reste 0 (inconnu).
 */
async function buildNativePrices(
  tokens: Address[],
  client: ReturnType<typeof createPublicClient>
): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  const WNATIVE = (addresses.WTTRUST as Address).toLowerCase();
  map[WNATIVE] = 1;

  for (const t of tokens) {
    const key = (t as string).toLowerCase();
    if (key === WNATIVE) {
      map[key] = 1;
      continue;
    }
    try {
      const pair = (await client.readContract({
        address: addresses.UniswapV2Factory as Address,
        abi: abi.UniswapV2Factory,
        functionName: "getPair",
        args: [t, addresses.WTTRUST as Address],
      })) as Address;

      if (!pair || pair === zeroAddress) continue;

      const [token0, decT, reservesRaw] = await Promise.all([
        client.readContract({
          address: pair,
          abi: abi.UniswapV2Pair,
          functionName: "token0",
        }),
        client
          .readContract({
            address: t,
            abi: erc20Abi,
            functionName: "decimals",
          })
          .catch(() => 18),
        client.readContract({
          address: pair,
          abi: abi.UniswapV2Pair,
          functionName: "getReserves",
        }),
      ]);

      const reserve0: bigint = Array.isArray(reservesRaw)
        ? (reservesRaw[0] as bigint)
        : (typeof reservesRaw === "object" && reservesRaw !== null && "reserve0" in reservesRaw
            ? (reservesRaw as any).reserve0
            : (typeof reservesRaw === "object" && reservesRaw !== null && "_reserve0" in reservesRaw
                ? (reservesRaw as any)._reserve0
                : 0n));
      const reserve1: bigint = Array.isArray(reservesRaw)
        ? (reservesRaw[1] as bigint)
        : (typeof reservesRaw === "object" && reservesRaw !== null && "reserve1" in reservesRaw
            ? (reservesRaw as any).reserve1
            : (typeof reservesRaw === "object" && reservesRaw !== null && "_reserve1" in reservesRaw
                ? (reservesRaw as any)._reserve1
                : 0n));

      const decW = 18; // WTTRUST
      const r0T = Number(formatUnits(reserve0, Number(decT)));
      const r1W = Number(formatUnits(reserve1, decW));
      const r0W = Number(formatUnits(reserve0, decW));
      const r1T = Number(formatUnits(reserve1, Number(decT)));

      let price = 0;
      if ((token0 as string).toLowerCase() === key) {
        // token0 = token, token1 = WTTRUST → price = W / T
        price = r1W / r0T;
      } else {
        // token1 = token, token0 = WTTRUST → price = W / T
        price = r0W / r1T;
      }
      if (isFinite(price) && price > 0) map[key] = price;
    } catch {
      // ignore
    }
  }

  return map;
}
