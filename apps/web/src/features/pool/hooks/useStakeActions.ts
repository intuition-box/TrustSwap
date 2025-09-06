// apps/web/src/features/pools/hooks/useStakeActions.ts
import { useWalletClient, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { abi } from "@trustswap/sdk";


export function useStakeActions(staking?: Address | null) {
const { data: wallet } = useWalletClient();
const publicClient = usePublicClient();


async function stake(amount: bigint) {
if (!staking || !wallet) throw new Error("No staking or wallet");
return wallet.writeContract({ address: staking, abi: abi.StakingRewards, functionName: "stake", args: [amount] });
}


async function withdraw(amount: bigint) {
if (!staking || !wallet) throw new Error("No staking or wallet");
return wallet.writeContract({ address: staking, abi: abi.StakingRewards, functionName: "withdraw", args: [amount] });
}


async function claim() {
if (!staking || !wallet) throw new Error("No staking or wallet");
return wallet.writeContract({ address: staking, abi: abi.StakingRewards, functionName: "getReward" });
}


return { stake, withdraw, claim };
}