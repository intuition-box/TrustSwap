// apps/web/src/features/pools/hooks/useStakingData.ts
import { useAccount, usePublicClient } from "wagmi";
import { useEffect, useState } from "react";
import type { Address, Abi } from "viem";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { addresses } from "@trustswap/sdk";
import type { PoolItem } from "../types";
import { getOrFetchToken, WNATIVE_ADDRESS } from "../../../lib/tokens";
import { FARMS } from "../../../lib/farms";

const STAKING_ABI = [
  { type: "function", name: "rewardRate",   stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "periodFinish", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply",  stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "earned",       stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf",    stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const satisfies Abi;

const FACTORY_ABI = [
  { type: "function", name: "getPair", stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "address" }] },
] as const satisfies Abi;

const PAIR_ABI = [
  { type: "function", name: "token0",      stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "getReserves", stateMutability: "view", inputs: [], outputs: [
      { type: "uint112" }, { type: "uint112" }, { type: "uint32" }
  ] },
] as const satisfies Abi;

export function useStakingData(pools: PoolItem[]) {
  const { address: user } = useAccount();
  const client = usePublicClient();
  const [data, setData] = useState<PoolItem[]>(pools);

  useEffect(() => {
    if (!client || !pools?.length) return;

    (async () => {
      const now = Math.floor(Date.now() / 1000);
      const out: PoolItem[] = [];

      for (const p of pools) {
        const farm = FARMS.find(f => f.stakingToken.toLowerCase() === (p.pair as string).toLowerCase());
        if (!farm) { out.push({ ...p, epochAprPct: 0, staking: null }); continue; }

        const staking = farm.stakingRewards as Address;
        const rewardsToken = farm.rewardsToken as Address;
        const decRw = farm.decimalsRw ?? 18;

        // --- reads SR ---
        let rewardRate = 0n, periodFinish = 0n, totalStakedLP = 0n;
        let earned = 0n, userStakedLP = 0n;

        try {
          const reads: Promise<any>[] = [
            client.readContract({ address: staking, abi: STAKING_ABI, functionName: "rewardRate" }),
            client.readContract({ address: staking, abi: STAKING_ABI, functionName: "periodFinish" }),
            client.readContract({ address: staking, abi: STAKING_ABI, functionName: "totalSupply" }),
          ];
          if (user) {
            reads.push(
              client.readContract({ address: staking, abi: STAKING_ABI, functionName: "earned", args: [user] }),
              client.readContract({ address: staking, abi: STAKING_ABI, functionName: "balanceOf", args: [user] }),
            );
          }
          const res = await Promise.all(reads);
          rewardRate    = res[0] as bigint;       // tokens/sec (en "wei" du token)
          periodFinish  = res[1] as bigint;
          totalStakedLP = res[2] as bigint;
          earned        = user ? (res[3] as bigint) : 0n;
          userStakedLP  = user ? (res[4] as bigint) : 0n;
        } catch {
          out.push({
            ...p,
            staking,
            rewardToken: await getOrFetchToken(rewardsToken),
            rewardRatePerSec: rewardRate,
            earned,
            stakedBalance: userStakedLP,
            epochAprPct: 0,
          });
          continue;
        }

        // --- prix du token de reward en WTTRUST ---
        const rewardPriceNative = await getNativePriceViaPair(client, rewardsToken, WNATIVE_ADDRESS);

        // --- valeur de TA MISE en WTTRUST ---
        let userStakeNative = 0; // WTTRUST
        try {
          const totalSupplyLP = await client.readContract({
            address: p.pair as Address,
            abi: erc20Abi,
            functionName: "totalSupply",
          }) as bigint;

          const tvlNative = Number(p.tvlNative || 0);                 // en WTTRUST
          const userSharePool = totalSupplyLP === 0n ? 0 : Number(userStakedLP) / Number(totalSupplyLP);
          userStakeNative = tvlNative * userSharePool;                 // valeur de ta mise
        } catch {
          userStakeNative = 0;
        }

        // --- TON flux de rewards (normalisé par décimales) ---
        const rewardRateTokens = Number(formatUnits(rewardRate, decRw)); // tokens/sec (en unités humaines)
        const userShareStaked = totalStakedLP === 0n ? 0 : Number(userStakedLP) / Number(totalStakedLP);
        const userRewardPerSecNative = rewardRateTokens * rewardPriceNative * userShareStaked; // WTTRUST/sec

        // --- APR perso (sur 365j) ---
        const active = now < Number(periodFinish || 0n);
        let epochAprPct = 0;
        if (active && userStakeNative > 0 && userRewardPerSecNative > 0) {
          const yearly = userRewardPerSecNative * 31_536_000;          // 365 j
          epochAprPct = (yearly / userStakeNative) * 100;
        } else {
          epochAprPct = 0;
        }

        out.push({
          ...p,
          staking,
          rewardToken: await getOrFetchToken(rewardsToken),
          rewardRatePerSec: rewardRate, // garde la valeur brute si tu en as besoin ailleurs
          earned,
          stakedBalance: userStakedLP,
          epochAprPct,
        });
      }

      setData(out);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, JSON.stringify(pools.map(x => (x.pair as string).toLowerCase()))]);

  return data;
}

// ---- helpers identiques à avant ----
async function getNativePriceViaPair(client: any, token: Address, WNATIVE: Address): Promise<number> {
  try {
    if (token.toLowerCase() === WNATIVE.toLowerCase()) return 1;

    const pair = await client.readContract({
      address: addresses.UniswapV2Factory as Address,
      abi: FACTORY_ABI,
      functionName: "getPair",
      args: [token, WNATIVE],
    }) as Address;
    if (!pair || pair === zeroAddress) return 0;

    const [token0, reserves] = await Promise.all([
      client.readContract({ address: pair, abi: PAIR_ABI, functionName: "token0" }) as Promise<Address>,
      client.readContract({ address: pair, abi: PAIR_ABI, functionName: "getReserves" }) as Promise<any>,
    ]);

    const reserve0: bigint = Array.isArray(reserves) ? reserves[0] : (reserves?.reserve0 ?? 0n);
    const reserve1: bigint = Array.isArray(reserves) ? reserves[1] : (reserves?.reserve1 ?? 0n);

    const decT = (await client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18)) as number;
    const decW = 18;

    const r0T = Number(formatUnits(reserve0, token0.toLowerCase() === token.toLowerCase() ? decT : decW));
    const r1W = Number(formatUnits(reserve1, token0.toLowerCase() === token.toLowerCase() ? decW : decT));
    const r0W = Number(formatUnits(reserve0, token0.toLowerCase() === token.toLowerCase() ? decW : decT));
    const r1T = Number(formatUnits(reserve1, token0.toLowerCase() === token.toLowerCase() ? decT : decW));

    const price = token0.toLowerCase() === token.toLowerCase() ? (r1W / r0T) : (r0W / r1T);
    return isFinite(price) && price > 0 ? price : 0;
  } catch { return 0; }
}
