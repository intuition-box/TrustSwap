// apps/web/src/features/pools/hooks/useStakingData.ts
import { useAccount, usePublicClient } from "wagmi";
import { useEffect, useMemo, useState } from "react";
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

type StakingSlice = {
  staking: Address | null;
  rewardToken?: Awaited<ReturnType<typeof getOrFetchToken>>;
  rewardRatePerSec?: bigint;
  earned?: bigint;
  stakedBalance?: bigint;
  epochAprPct?: number;
};

export function useStakingData(pools: PoolItem[]) {
  const { address: user } = useAccount();
  const client = usePublicClient();

  // ✅ on stocke uniquement le “slice” staking par paire
  const [stakingMap, setStakingMap] = useState<Record<string, StakingSlice>>({});

  // clé stable des paires (évite JSON.stringify volumineux)
  const pairsKey = useMemo(
    () => pools.length ? pools.map(p => (p.pair as string).toLowerCase()).sort().join(",") : "none",
    [pools]
  );

  // 👇 Lecture on-chain du staking (ne se déclenche que si la liste d’adresses change)
  useEffect(() => {
    if (!client || !pools.length) return;
    let cancelled = false;

    (async () => {
      const now = Math.floor(Date.now() / 1000);

      for (const p of pools) {
        const key = (p.pair as string).toLowerCase();
        const farm = FARMS.find(f => f.stakingToken.toLowerCase() === key);
        if (!farm) {
          if (!cancelled) {
            setStakingMap(prev => ({ ...prev, [key]: { staking: null, epochAprPct: 0 } }));
          }
          continue;
        }

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
          rewardRate    = res[0] as bigint;
          periodFinish  = res[1] as bigint;
          totalStakedLP = res[2] as bigint;
          earned        = user ? (res[3] as bigint) : 0n;
          userStakedLP  = user ? (res[4] as bigint) : 0n;
        } catch {
          if (!cancelled) {
            setStakingMap(prev => ({
              ...prev,
              [key]: {
                staking,
                rewardToken: prev[key]?.rewardToken, // garde si déjà fetch
                rewardRatePerSec: rewardRate,
                earned,
                stakedBalance: userStakedLP,
                epochAprPct: 0,
              }
            }));
          }
          continue;
        }

        // --- prix du token de reward en WTTRUST ---
        const rewardPriceNative = await getNativePriceViaPair(client, rewardsToken, WNATIVE_ADDRESS);

        // --- valeur TA mise (WTTRUST) ---
        let userStakeNative = 0; // WTTRUST
        try {
          const totalSupplyLP = await client.readContract({
            address: p.pair as Address,
            abi: erc20Abi,
            functionName: "totalSupply",
          }) as bigint;

          const tvlNative = Number(p.tvlNative || 0);
          const userSharePool = totalSupplyLP === 0n ? 0 : Number(userStakedLP) / Number(totalSupplyLP);
          userStakeNative = tvlNative * userSharePool;
        } catch {
          userStakeNative = 0;
        }

        // --- APR perso ---
        const rewardRateTokens = Number(formatUnits(rewardRate, decRw));
        const userShareStaked = totalStakedLP === 0n ? 0 : Number(userStakedLP) / Number(totalStakedLP);
        const userRewardPerSecNative = rewardRateTokens * rewardPriceNative * userShareStaked;
        const active = now < Number(periodFinish || 0n);
        const epochAprPct =
          active && userStakeNative > 0 && userRewardPerSecNative > 0
            ? (userRewardPerSecNative * 31_536_000 / userStakeNative) * 100
            : 0;
        const fetchedRewardToken = await getOrFetchToken(rewardsToken);
        
        if (!cancelled) {
          setStakingMap(prev => {
            const cur = prev[key]; // état courant pour cette pair (peut déjà exister)
            return {
              ...prev,
              [key]: {
                staking,
                // si on avait déjà un rewardToken, on le garde, sinon on prend celui qu'on vient de fetch
                rewardToken: cur?.rewardToken ?? fetchedRewardToken,
                rewardRatePerSec: rewardRate,
                earned,
                stakedBalance: userStakedLP,
                epochAprPct,
              },
            };
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [client, pairsKey, WNATIVE_ADDRESS, addresses.UniswapV2Factory]);

  // ✅ Fusion dynamique: à chaque render, on renvoie pools + slices staking
  const merged = useMemo<PoolItem[]>(() => {
    return pools.map(p => {
      const key = (p.pair as string).toLowerCase();
      const s = stakingMap[key];
      return {
        ...p,                 // <-- contient tvlNative, vol1dNative, poolAprPct frais (toujours frais)
        ...(s ?? { staking: null, epochAprPct: 0 }),
      } as PoolItem;
    });
  }, [pools, stakingMap]);

  return merged;
}

// ---- helpers inchangés ----
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
