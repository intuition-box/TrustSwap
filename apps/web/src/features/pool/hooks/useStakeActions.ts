import { useWalletClient, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { abi } from "@trustswap/sdk";
import { parseGwei } from "viem";

const GAS_PRICE = parseGwei("0.1");

export function useStakeActions(staking?: Address | null) {
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();

  async function withFeeOverrides(base: any) {
    if (!wallet || !publicClient) throw new Error("Wallet/Public client missing");
    const account = wallet.account?.address as Address;
    const gas = await publicClient.estimateContractGas({ account, ...base });
    const gasWithBuffer = (gas * 115n) / 100n;
    return { ...base, account, gas: gasWithBuffer, gasPrice: GAS_PRICE };
  }

  async function stake(amount: bigint) {
    if (!staking || !wallet) throw new Error("No staking or wallet");
    const base = { address: staking, abi: abi.StakingRewards, functionName: "stake", args: [amount] } as const;
    const overrides = await withFeeOverrides(base);
    return wallet.writeContract(overrides);
  }

  async function withdraw(amount: bigint) {
    if (!staking || !wallet) throw new Error("No staking or wallet");
    const base = { address: staking, abi: abi.StakingRewards, functionName: "withdraw", args: [amount] } as const;
    const overrides = await withFeeOverrides(base);
    return wallet.writeContract(overrides);
  }

  async function claim() {
    if (!staking || !wallet) throw new Error("No staking or wallet");
    const base = { address: staking, abi: abi.StakingRewards, functionName: "getReward" } as const;
    const overrides = await withFeeOverrides(base);
    return wallet.writeContract(overrides);
  }

  return { stake, withdraw, claim };
}
