// apps/web/src/features/pools/hooks/useStakingData.ts
import { useAccount, usePublicClient } from "wagmi";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address, Abi } from "viem";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { addresses } from "@trustswap/sdk";
import type { PoolItem } from "../types";
import { useTokenModule } from "../../../hooks/useTokenModule";

import { FARMS } from "../../../lib/farms";
import { useLiveRegister } from "../../../live/LiveRefetchProvider";

const SEC_PER_YEAR = 31_536_000;
const FEE_TO_LPS = 0.003; // 0.3% fees distributed to LPs
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


export function useStakingData(pools: PoolItem[]) {
  const { address: user } = useAccount();
  const client = usePublicClient();
  const {WNATIVE_ADDRESS, getOrFetchToken} = useTokenModule();

  type StakingSlice = {
    staking: Address | null;
    rewardToken?: Awaited<ReturnType<typeof getOrFetchToken>>;
    rewardRatePerSec?: bigint;
    earned?: bigint;
    stakedBalance?: bigint;       // user staked LP
    walletLpBalance?: bigint;     // user wallet LP (outside farm)
    periodFinish?: bigint;        // timestamp (sec)
    periodFinishDate?: Date;

    totalStakedLP?: bigint;       // farm total staked LP (all users)
    totalSupplyLP?: bigint;       // LP token total supply
    poolReserves?: { token0: Address; token1: Address; reserve0: bigint; reserve1: bigint };

    poolAprPct?: number;          // fees APR (trading fees -> LPs)
    epochAprPct?: number;         // farming APR (global)
    epochAprUserPct?: number;     // OPTIONAL: user-specific APR
  };

  const [stakingMap, setStakingMap] = useState<Record<string, StakingSlice>>({});

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

      // ---- Pair data (ALWAYS compute: required for Pool APR even without farm)
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
        // keep defaults -> tvlNative will be 0 => poolAprPct will be 0
      }

      // ---- Pool TVL (fees APR uses whole pool TVL)
      const tvlNative = await getPairTVLNative(client, token0, token1, reserve0, reserve1, WNATIVE_ADDRESS);

      // ---- Pool APR (fees) computed for EVERY pool
      const vol1dNative = Number(p.vol1dNative ?? 0);
      const tvlPoolNative = Number(tvlNative);
      const poolAprFeesPct =
        tvlPoolNative > 0 && vol1dNative > 0
          ? (vol1dNative * FEE_TO_LPS * 365 / tvlPoolNative) * 100
          : 0;

      // ---- Optional farm
      const farm = FARMS.find(f => f.stakingToken.toLowerCase() === key);

      // If NO farm: still store Pool APR and basic data
      if (!farm) {
        next[key] = {
          staking: null,
          rewardRatePerSec: 0n,
          earned: 0n,
          stakedBalance: 0n,
          walletLpBalance: 0n,
          periodFinish: 0n,
          periodFinishDate: undefined,
          totalStakedLP: 0n,
          totalSupplyLP,
          poolReserves: token0 && token1 ? { token0, token1, reserve0, reserve1 } : undefined,
          poolAprPct: poolAprFeesPct,
          epochAprPct: 0,
          epochAprUserPct: 0,
        };
        continue;
      }

      // ---- Farm exists: compute farming APR (global) + user metrics
      const staking = farm.stakingRewards as Address;
      const rewardsToken = farm.rewardsToken as Address;
      const decRw = farm.decimalsRw ?? 18;

      // Core farm reads (DO NOT include user reads here)
      let rewardRate = 0n, periodFinish = 0n, totalStakedLP = 0n;
      try {
        const [rr, pf, ts] = await Promise.all([
          client.readContract({ address: staking, abi: STAKING_ABI, functionName: "rewardRate" }) as Promise<bigint>,
          client.readContract({ address: staking, abi: STAKING_ABI, functionName: "periodFinish" }) as Promise<bigint>,
          client.readContract({ address: staking, abi: STAKING_ABI, functionName: "totalSupply" }) as Promise<bigint>,
        ]);
        rewardRate = rr;
        periodFinish = pf;
        totalStakedLP = ts;
      } catch {
        // Keep Pool APR visible even if farm reads fail
        next[key] = {
          staking,
          rewardRatePerSec: rewardRate,
          periodFinish,
          periodFinishDate: periodFinish ? new Date(Number(periodFinish) * 1000) : undefined,
          totalStakedLP,
          totalSupplyLP,
          poolReserves: token0 && token1 ? { token0, token1, reserve0, reserve1 } : undefined,
          poolAprPct: poolAprFeesPct,
          epochAprPct: 0,
          epochAprUserPct: 0,
        };
        continue;
      }

      // Reward token price in native (0 if no direct route)
      const rewardPriceNative = await getNativePriceViaPair(client, rewardsToken, WNATIVE_ADDRESS);
      const rewardRateTokensPerSec = Number(formatUnits(rewardRate, decRw));

      // Farming APR uses STAKED TVL (not the whole pool TVL)
      const stakedShare =
        totalSupplyLP === 0n ? 0 : Number(totalStakedLP) / Number(totalSupplyLP);
      const stakedTvlNative = tvlNative * stakedShare;

      const active = now < Number(periodFinish || 0n);
      const epochAprFarmPct =
        active && stakedTvlNative > 0 && rewardRateTokensPerSec > 0 && rewardPriceNative > 0
          ? (rewardRateTokensPerSec * rewardPriceNative * SEC_PER_YEAR / stakedTvlNative) * 100
          : 0;

      // User reads isolated (must never hide Pool APR if they fail)
      let earned = 0n, userStakedLP = 0n, walletLpBalance = 0n;
      try {
        if (user) {
          [earned, userStakedLP, walletLpBalance] = await Promise.all([
            client.readContract({ address: staking, abi: STAKING_ABI, functionName: "earned", args: [user] }) as Promise<bigint>,
            client.readContract({ address: staking, abi: STAKING_ABI, functionName: "balanceOf", args: [user] }) as Promise<bigint>,
            client.readContract({ address: p.pair as Address, abi: erc20Abi, functionName: "balanceOf", args: [user] }) as Promise<bigint>,
          ]);
        }
      } catch {
        // ignore user read failures
      }

      const fetchedRewardToken = await getOrFetchToken(rewardsToken);

      // Optional: user-specific APR
      const userShareStaked =
        totalStakedLP === 0n ? 0 : Number(userStakedLP) / Number(totalStakedLP);
      const userSharePool =
        totalSupplyLP === 0n ? 0 : Number(userStakedLP) / Number(totalSupplyLP);
      const userStakeNative = Number(tvlNative) * userSharePool;
      const userRewardPerSecNative = rewardRateTokensPerSec * rewardPriceNative * userShareStaked;
      const epochAprUserPct =
        active && userStakeNative > 0 && userRewardPerSecNative > 0
          ? (userRewardPerSecNative * SEC_PER_YEAR / userStakeNative) * 100
          : 0;

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

        // Always present
        poolAprPct: poolAprFeesPct,   // fees APR (pool)
        epochAprPct: epochAprFarmPct, // farming APR (global)
        epochAprUserPct,
      };
    }

    setStakingMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, pairsKey, user]);

  useEffect(() => { void reload(); }, [reload]);

  useLiveRegister(reload);

  // IMPORTANT: do not override an existing pool.poolAprPct with 0 when there is no slice
  const merged = useMemo<PoolItem[]>(() => {
    return pools.map(p => {
      const key = (p.pair as string).toLowerCase();
      const s = stakingMap[key];
      return {
        ...p,
        ...(s ?? { staking: null, epochAprPct: 0 }), // <-- do NOT default poolAprPct here
      } as PoolItem;
    });
  }, [pools, stakingMap]);

  return merged;
}

/** Return token price in native via (token, WNATIVE) pair. Returns 0 if no pair/liquidity. */
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

/** Pool TVL (in native) from pair reserves. Returns 0 if token0/1 missing. */
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
