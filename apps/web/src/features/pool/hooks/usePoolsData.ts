// apps/web/src/features/pools/hooks/usePoolsData.ts
import { useEffect, useMemo, useState } from "react";
import { type Address, zeroAddress, createPublicClient, http } from "viem";
import { abi, addresses, INTUITION } from "@trustswap/sdk";
import { getTokenByAddress, getOrFetchToken } from "../../../lib/tokens";
import type { PoolItem, TokenInfo } from "../types";

const client = createPublicClient({
chain: INTUITION,
transport: http(INTUITION.rpcUrls.default.http[0])
});


export function usePoolsData(limit = 50, offset = 0) {
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [items, setItems] = useState<PoolItem[]>([]);


useEffect(() => {
(async () => {
try {
setLoading(true);
const total = await client.readContract({
address: addresses.UniswapV2Factory as Address,
abi: abi.UniswapV2Factory,
functionName: "allPairsLength",
}) as bigint;
const start = Number(offset);
const end = Math.min(Number(total), start + limit);


const pairAddrs = await Promise.all(
Array.from({ length: end - start }, (_, i) =>
client.readContract({
address: addresses.UniswapV2Factory as Address,
abi: abi.UniswapV2Factory,
functionName: "allPairs",
args: [BigInt(start + i)],
})
)
);


const pairs = await Promise.all(
  pairAddrs.map(async (pair) => {
    const [t0, t1] = await Promise.all([
      client.readContract({ address: pair as Address, abi: abi.UniswapV2Pair, functionName: "token0" }),
      client.readContract({ address: pair as Address, abi: abi.UniswapV2Pair, functionName: "token1" }),
    ]);

    // 🚑 viem renvoie un tuple ou des props sans underscore
    const reserves: any = await client.readContract({
      address: pair as Address,
      abi: abi.UniswapV2Pair,
      functionName: "getReserves",
    });

    const reserve0: bigint =
      (Array.isArray(reserves) ? reserves[0] : reserves?.reserve0 ?? reserves?._reserve0) ?? 0n;
    const reserve1: bigint =
      (Array.isArray(reserves) ? reserves[1] : reserves?.reserve1 ?? reserves?._reserve1) ?? 0n;

    const t0Info = await getOrFetchToken(t0 as Address);
    const t1Info = await getOrFetchToken(t1 as Address);

    const item: PoolItem = {
      pair: pair as Address,
      token0: t0Info,
      token1: t1Info,
      reserve0,               // ✅ toujours bigint
      reserve1,               // ✅ toujours bigint
      srf: addresses.StakingRewardsFactory as Address,
      staking: null,
    };
    return item;
  })
);


setItems(pairs);
} catch (e: any) {
setError(e?.message || String(e));
} finally {
setLoading(false);
}
})();
}, [limit, offset]);


return { loading, error, items };
}


function tokenToInfo(x: any): TokenInfo {
return {
address: x.address,
symbol: x.symbol,
decimals: x.decimals,
logoURI: x.logoURI,
};
}