// apps/web/src/features/pools/hooks/useStakingData.ts
import { useAccount, usePublicClient } from "wagmi";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address, Abi } from "viem";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { addresses } from "@trustswap/sdk";
import type { PoolItem } from "../types";
import { getOrFetchToken, WNATIVE_ADDRESS } from "../../../lib/tokens";
import { FARMS } from "../../../lib/farms";
import { useLiveRegister } from "../../../live/LiveRefetchProvider";

const SEC_PER_YEAR = 31_536_000;

// --- ABIs ---
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
  { type: "function", name: "token1",      stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "getReserves", stateMutability: "view", inputs: [], outputs: [
      { type: "uint112" }, { type: "uint112" }, { type: "uint32" }
  ] },
] as const satisfies Abi;

type StakingSlice = {
  staking: Address | null;
  rewardToken?: Awaited<ReturnType<typeof getOrFetchToken>>;
  rewardRatePerSec?: bigint;
  earned?: bigint;
  stakedBalance?: bigint;       // LP stakés par l’utilisateur
  walletLpBalance?: bigint;     // LP possédés en wallet (hors farm)
  periodFinish?: bigint;        // timestamp (sec)
  periodFinishDate?: Date;

  totalStakedLP?: bigint;       // LP stakés dans le farm (tous users)
  totalSupplyLP?: bigint;       // supply totale du token LP
  poolReserves?: { token0: Address; token1: Address; reserve0: bigint; reserve1: bigint };

  poolAprPct?: number;          // fees APR (from trading fees -> LPs)
  epochAprPct?: number;         // farming APR (global, rewards over staked TVL)
  epochAprUserPct?: number;     // OPTIONAL: user-specific APR
};

export function useStakingData(pools: PoolItem[]) {
  const { address: user } = useAccount();
  const client = usePublicClient();

  const [stakingMap, setStakingMap] = useState<Record<string, StakingSlice>>({});

  // Clé de rafraîchissement quand la liste de pools change
  const pairsKey = useMemo(
    () => (pools.length ? pools.map(p => (p.pair as string).toLowerCase()).sort().join(",") : "none"),
    [pools]
  );

  

  const reload = useCallback(async () => {
    if (!client || !pools.length) return;

    const now = Math.floor(Date.now() / 1000);
    const next: Record<string, StakingSlice> = { ...stakingMap };

    for (const p of pools) {
      const key = (p.pair as string).toLowerCase();
      const farm = FARMS.find(f => f.stakingToken.toLowerCase() === key);

      if (!farm) {
        next[key] = { staking: null, epochAprPct: 0 };
        continue;
      }

      const staking = farm.stakingRewards as Address;
      const rewardsToken = farm.rewardsToken as Address;
      const decRw = farm.decimalsRw ?? 18;

      // --- Read user LP wallet balance (optionnel)
      let walletLpBalance = 0n;
      if (user) {
        try {
          walletLpBalance = await client.readContract({
            address: p.pair as Address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [user],
          }) as bigint;
        } catch { /* ignore */ }
      }

      // --- Read StakingRewards core data
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
        next[key] = {
          staking,
          rewardToken: next[key]?.rewardToken,
          rewardRatePerSec: rewardRate,
          earned,
          stakedBalance: userStakedLP,
          walletLpBalance,
          periodFinish,
          periodFinishDate: new Date(Number(periodFinish) * 1000),
          totalStakedLP,
          totalSupplyLP: 0n,
          epochAprPct: 0,
        };
        continue;
      }

      // --- Prix du token de reward en natif
      const rewardPriceNative = await getNativePriceViaPair(client, rewardsToken, WNATIVE_ADDRESS);

      // --- Lecture pair data (reserves + totalSupply LP)
      let token0: Address | null = null;
      let token1: Address | null = null;
      let reserve0: bigint = 0n;
      let reserve1: bigint = 0n;
      let totalSupplyLP: bigint = 0n;

      try {
        const [t0, t1, rsv, ts] = await Promise.all([
          client.readContract({ address: p.pair as Address, abi: PAIR_ABI, functionName: "token0" }) as Promise<Address>,
          client.readContract({ address: p.pair as Address, abi: PAIR_ABI, functionName: "token1" }) as Promise<Address>,
          client.readContract({ address: p.pair as Address, abi: PAIR_ABI, functionName: "getReserves" }) as Promise<any>,
          client.readContract({ address: p.pair as Address, abi: erc20Abi, functionName: "totalSupply" }) as Promise<bigint>,
        ]);
        token0 = t0;
        token1 = t1;
        const [r0, r1] = Array.isArray(rsv)
          ? [rsv[0] as bigint, rsv[1] as bigint]
          : [rsv?.reserve0 ?? 0n, rsv?.reserve1 ?? 0n];
        reserve0 = r0;
        reserve1 = r1;
        totalSupplyLP = ts;
      } catch {
        // si lecture échoue, on garde 0 et l’APR sera 0 (guard)
      }

      // --- TVL en natif (via pricing token0/token1 -> WNATIVE)
      const tvlNative = await getPairTVLNative(client, token0, token1, reserve0, reserve1, WNATIVE_ADDRESS);

      const FEE_TO_LPS = 0.003;
      const vol1dNative = Number(p.vol1dNative ?? 0);
      const tvlPoolNative = Number(tvlNative);
      const poolAprFeesPct =
        tvlPoolNative > 0 && vol1dNative > 0
          ? (vol1dNative * FEE_TO_LPS * 365 / tvlPoolNative) * 100
          : 0;

      const stakedShare =
        totalSupplyLP === 0n ? 0 : Number(totalStakedLP) / Number(totalSupplyLP);
      const stakedTvlNative = tvlNative * stakedShare;

  const rewardRateTokensPerSec = Number(formatUnits(rewardRate, decRw));
  const active = now < Number(periodFinish || 0n);

  const epochAprFarmPct =
    active && stakedTvlNative > 0 && rewardRateTokensPerSec > 0 && rewardPriceNative > 0
      ? (rewardRateTokensPerSec * rewardPriceNative * SEC_PER_YEAR / stakedTvlNative) * 100
      : 0;

  // OPTIONAL: user-specific APR (kept if you need it later)
  const userShareStaked =
    totalStakedLP === 0n ? 0 : Number(userStakedLP) / Number(totalStakedLP);
  const userSharePool =
    totalSupplyLP === 0n ? 0 : Number(userStakedLP) / Number(totalSupplyLP);

  const userStakeNative = tvlNative * userSharePool;
  const userRewardPerSecNative = rewardRateTokensPerSec * rewardPriceNative * userShareStaked;

  const epochAprUserPct =
    active && userStakeNative > 0 && userRewardPerSecNative > 0
      ? (userRewardPerSecNative * SEC_PER_YEAR / userStakeNative) * 100
      : 0;

      const fetchedRewardToken = await getOrFetchToken(rewardsToken);

      next[key] = {
        staking,
        rewardToken: next[key]?.rewardToken ?? fetchedRewardToken,
        rewardRatePerSec: rewardRate,
        earned,
        stakedBalance: userStakedLP,
        walletLpBalance,
        periodFinish,
        periodFinishDate: new Date(Number(periodFinish) * 1000),
        totalStakedLP,
        totalSupplyLP,
        poolReserves: token0 && token1 ? { token0, token1, reserve0, reserve1 } : undefined,
        poolAprPct: poolAprFeesPct,     // 👈 fees APR (LP earnings from volume)
        epochAprPct: epochAprFarmPct,   // 👈 farming APR (global)
        epochAprUserPct,                // 👈 optional, not used in UI
      };
    }

    setStakingMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, pairsKey, user]);

  useEffect(() => { void reload(); }, [reload]);

  // 🔔 rafraîchissement live (nouveau bloc / trigger après tx)
  useLiveRegister(reload);

  // Merge final dans la liste de pools
  const merged = useMemo<PoolItem[]>(() => {
    return pools.map(p => {
      const key = (p.pair as string).toLowerCase();
      const s = stakingMap[key];
      return {
        ...p,
        ...(s ?? { staking: null, poolAprPct: 0, epochAprPct: 0 }),
      } as PoolItem;
    });
  }, [pools, stakingMap]);

  return merged;
}

/** Prix d’un token en natif via la pair (token, WNATIVE). Retourne 0 si pas de pair/liquidité. */
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

    const [token0, reserves, decT] = await Promise.all([
      client.readContract({ address: pair, abi: PAIR_ABI, functionName: "token0" }) as Promise<Address>,
      client.readContract({ address: pair, abi: PAIR_ABI, functionName: "getReserves" }) as Promise<any>,
      client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18) as Promise<number>,
    ]);

    const reserve0: bigint = Array.isArray(reserves) ? reserves[0] : (reserves?.reserve0 ?? 0n);
    const reserve1: bigint = Array.isArray(reserves) ? reserves[1] : (reserves?.reserve1 ?? 0n);

    // Si token est token0: price = reserveWNATIVE / reserveTOKEN
    // Sinon:               price = reserveWNATIVE / reserveTOKEN (avec les réserves inversées)
    if (token0.toLowerCase() === token.toLowerCase()) {
      const t = Number(formatUnits(reserve0, decT));
      const w = Number(formatUnits(reserve1, 18));
      const price = w / t;
      return Number.isFinite(price) && price > 0 ? price : 0;
    } else {
      const t = Number(formatUnits(reserve1, decT));
      const w = Number(formatUnits(reserve0, 18));
      const price = w / t;
      return Number.isFinite(price) && price > 0 ? price : 0;
    }
  } catch {
    return 0;
  }
}


/** TVL (en natif) à partir des réserves du pair. Si token0/1 nulls, renvoie 0. */
async function getPairTVLNative(
  client: any,
  token0: Address | null,
  token1: Address | null,
  reserve0: bigint,
  reserve1: bigint,
  WNATIVE: Address
): Promise<number> {
  if (!token0 || !token1) return 0;

  try {
    const [dec0, dec1] = await Promise.all([
      client.readContract({ address: token0, abi: erc20Abi, functionName: "decimals" }).catch(() => 18) as Promise<number>,
      client.readContract({ address: token1, abi: erc20Abi, functionName: "decimals" }).catch(() => 18) as Promise<number>,
    ]);

    const p0 = token0.toLowerCase() === WNATIVE.toLowerCase()
      ? 1
      : await getNativePriceViaPair(client, token0, WNATIVE);

    const p1 = token1.toLowerCase() === WNATIVE.toLowerCase()
      ? 1
      : await getNativePriceViaPair(client, token1, WNATIVE);

    const r0 = Number(formatUnits(reserve0, dec0));
    const r1 = Number(formatUnits(reserve1, dec1));

    const v0 = r0 * (Number.isFinite(p0) ? p0 : 0);
    const v1 = r1 * (Number.isFinite(p1) ? p1 : 0);

    const tvl = v0 + v1;
    return Number.isFinite(tvl) && tvl > 0 ? tvl : 0;
  } catch {
    return 0;
  }
}

