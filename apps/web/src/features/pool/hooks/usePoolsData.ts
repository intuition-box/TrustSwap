// apps/web/src/features/pools/hooks/usePoolsData.ts
import { useEffect, useMemo, useState } from "react";
import { type Address, zeroAddress, createPublicClient, http } from "viem";
import { abi, addresses, INTUITION } from "@trustswap/sdk";
import { getTokenByAddress } from "../../../lib/tokens";
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
// token0/token1
const [t0, t1] = await Promise.all([
client.readContract({ address: pair as Address, abi: abi.UniswapV2Pair, functionName: "token0" }),
client.readContract({ address: pair as Address, abi: abi.UniswapV2Pair, functionName: "token1" }),
]);


const [r] = await Promise.all([
client.readContract({ address: pair as Address, abi: abi.UniswapV2Pair, functionName: "getReserves" })
]);
const { _reserve0, _reserve1 } = r as any;


const t0Info = getTokenByAddress(t0 as Address);
const t1Info = getTokenByAddress(t1 as Address);


const item: PoolItem = {
pair: pair as Address,
token0: tokenToInfo(t0Info),
token1: tokenToInfo(t1Info),
reserve0: _reserve0,
reserve1: _reserve1,
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