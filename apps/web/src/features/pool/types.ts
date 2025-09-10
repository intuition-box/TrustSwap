// apps/web/src/features/pools/types.ts
import type { Address } from "viem";


export type TokenInfo = {
  address: Address;
  symbol: string;
  decimals: number;
  logoURI?: string;
};


export type PoolItem = {
  pair: Address;
  token0: TokenInfo;
  token1: TokenInfo;
  reserve0: bigint;
  reserve1: bigint;
  tvlNative?: number; // computed in native (tTRUST) for now
  vol1dNative?: number; // 24h volume in native
  poolAprPct?: number; // from fees
  epochAprPct?: number; // from SR contract
  srf?: Address | null; // StakingRewardsFactory (optional per-pair mapping)
  staking?: Address | null; // StakingRewards contract for this pair
  rewardToken?: TokenInfo; // e.g., TSWP
  rewardRatePerSec?: bigint; // from SR contract
  earned?: bigint; // user earned
  stakedBalance?: bigint; // user LP staked
  walletLpBalance?: bigint;   // user LP in wallet
};