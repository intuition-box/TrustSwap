// apps/web/src/features/pools/hooks/usePairsVolume1D.ts
import { useEffect, useMemo, useState } from "react";
import type { Address, Abi } from "viem";
import { createPublicClient, http, formatUnits, parseAbiItem, zeroAddress, erc20Abi } from "viem";
import { INTUITION, addresses, abi as SDK_ABI } from "@trustswap/sdk";
import { WNATIVE_ADDRESS } from "../../../lib/tokens";

const SWAP_EVENT = parseAbiItem(
  "event Swap(address indexed sender,uint amount0In,uint amount1In,uint amount0Out,uint amount1Out,address indexed to)"
);

// Ajuste si besoin selon ton réseau
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

  // clé de dépendance sans bigint
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
      setPriceMap({ [WNATIVE_ADDRESS.toLowerCase()]: 1 }); // WTTRUST = 1
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

      // 1) Prix token -> WTTRUST via {token, WTTRUST}
      const tokenSet = new Set<string>();
      for (const p of pairs) {
        tokenSet.add(p.token0.address.toLowerCase());
        tokenSet.add(p.token1.address.toLowerCase());
      }
      const prices = await buildNativePrices(
        [...tokenSet] as Address[],
        client
      );
      // WTTRUST doit être 1
      prices[WNATIVE_ADDRESS.toLowerCase()] = 1;
      setPriceMap(prices);

      // 2) Volume 24h par pair (WTTRUST)
      const out: Record<string, number> = {};
      for (const p of pairs) {
        try {
          const logs = await client.getLogs({
            address: p.pair,
            event: SWAP_EVENT,
            fromBlock,
            toBlock: latest,
          });

          const p0 = prices[p.token0.address.toLowerCase()] ?? (p.token0.address.toLowerCase() === WNATIVE_ADDRESS.toLowerCase() ? 1 : 0);
          const p1 = prices[p.token1.address.toLowerCase()] ?? (p.token1.address.toLowerCase() === WNATIVE_ADDRESS.toLowerCase() ? 1 : 0);

          let vol = 0;
          for (const log of logs) {
            const { amount0In, amount1In, amount0Out, amount1Out } = log.args as any;
            const in0  = Number(formatUnits(amount0In  as bigint, p.token0.decimals)) * p0;
            const in1  = Number(formatUnits(amount1In  as bigint, p.token1.decimals)) * p1;
            const out0 = Number(formatUnits(amount0Out as bigint, p.token0.decimals)) * p0;
            const out1 = Number(formatUnits(amount1Out as bigint, p.token1.decimals)) * p1;
            vol += Math.max(in0 + in1, out0 + out1);
          }
          out[p.pair.toLowerCase()] = vol;
        } catch {
          out[p.pair.toLowerCase()] = 0;
        }
      }
      setVolMap(out);
    })();
  }, [depKey]);

  return { volMap, priceMap };
}

// ---- helpers ----------------------------------------------------------------
async function buildNativePrices(tokens: Address[], client: ReturnType<typeof createPublicClient>): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  const W = WNATIVE_ADDRESS.toLowerCase();
  map[W] = 1;

  for (const t of tokens) {
    const key = (t as string).toLowerCase();
    if (key === W) { map[key] = 1; continue; }
    try {
      const pair = (await client.readContract({
        address: addresses.UniswapV2Factory as Address,
        abi: SDK_ABI.UniswapV2Factory,
        functionName: "getPair",
        args: [t, WNATIVE_ADDRESS],
      })) as Address;

      if (!pair || pair === zeroAddress) continue;

      const [token0, reserves] = await Promise.all([
        client.readContract({ address: pair, abi: SDK_ABI.UniswapV2Pair, functionName: "token0" }) as Promise<Address>,
        client.readContract({ address: pair, abi: SDK_ABI.UniswapV2Pair, functionName: "getReserves" }) as Promise<any>,
      ]);

      const reserve0: bigint = Array.isArray(reserves) ? reserves[0] : (reserves?.reserve0 ?? reserves?._reserve0 ?? 0n);
      const reserve1: bigint = Array.isArray(reserves) ? reserves[1] : (reserves?.reserve1 ?? reserves?._reserve1 ?? 0n);

      const decT = (await client.readContract({ address: t, abi: erc20Abi, functionName: "decimals" }).catch(() => 18)) as number;
      const decW = 18;

      // price(token in WTTRUST)
      let price = 0;
      if ((token0 as string).toLowerCase() === key) {
        // token0 = token, token1 = WTTRUST → price = W / T
        price = Number(formatUnits(reserve1, decW)) / Number(formatUnits(reserve0, decT));
      } else {
        // token1 = token, token0 = WTTRUST
        price = Number(formatUnits(reserve0, decW)) / Number(formatUnits(reserve1, decT));
      }
      if (isFinite(price) && price > 0) map[key] = price;
    } catch { /* ignore */ }
  }

  return map;
}
