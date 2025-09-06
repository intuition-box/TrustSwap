// apps/web/src/features/pools/hooks/useStakingData.ts
import { useAccount, usePublicClient } from "wagmi";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { abi, addresses } from "@trustswap/sdk";
import type { PoolItem } from "../types";


export function useStakingData(pools: PoolItem[]) {
const { address: user } = useAccount();
const client = usePublicClient();
const [data, setData] = useState<PoolItem[]>(pools);


useEffect(() => {
(async () => {
if (!client) return;
const out: PoolItem[] = [];
for (const p of pools) {
// Map pair -> staking contract (if any)
let staking: Address | null = null;
try {
staking = await client.readContract({
address: addresses.StakingRewardsFactory as Address,
abi: abi.StakingRewardsFactoryV2,
functionName: "stakingRewardsInfoByPool", // adjust if different API
args: [p.pair],
}).then((x: any) => x?.stakingRewards as Address).catch(() => null);
} catch {}


let earned: bigint | undefined;
let stakedBalance: bigint | undefined;
let rewardRatePerSec: bigint | undefined;
if (staking) {
try {
[earned, stakedBalance, rewardRatePerSec] = await Promise.all([
user ? client.readContract({ address: staking, abi: abi.StakingRewards, functionName: "earned", args: [user] }) : 0n,
user ? client.readContract({ address: staking, abi: abi.StakingRewards, functionName: "balanceOf", args: [user] }) : 0n,
client.readContract({ address: staking, abi: abi.StakingRewards, functionName: "rewardRate" }),
]) as any;
} catch {}
}
out.push({ ...p, staking: staking || null, earned, stakedBalance, rewardRatePerSec });
}
setData(out);
})();
}, [client, pools, user]);


return data;
}