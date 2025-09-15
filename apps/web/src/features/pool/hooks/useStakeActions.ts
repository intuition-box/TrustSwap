// apps/web/src/features/pools/hooks/useStakeActions.ts
import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import type { Address } from "viem";
import { abi } from "@trustswap/sdk";
import { erc20Abi, maxUint256, parseGwei } from "viem";
import { useAlerts } from "../../../features/alerts/Alerts";

const GAS_PRICE = parseGwei("0.1");

// ---------- Explorer URL (ajoute tes chainIds si besoin) ----------
function explorerTx(chainId: number | undefined, hash?: `0x${string}`) {
  if (!hash) return undefined;
  const map: Record<number, string> = {
    13579: "https://explorer.intuition.systems/tx/",
  };
  const base = map[chainId ?? 0];
  return base ? `${base}${hash}` : undefined;
}

// ---------- Erreurs lisibles (EN) ----------
function prettifyStakingError(err: any): string {
  const raw =
    String(err?.shortMessage || "") + " | " +
    String(err?.message || "") + " | " +
    String(err?.cause?.shortMessage || "") + " | " +
    String(err?.cause?.message || "");
  const msg = raw.toLowerCase();

  if (
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("request rejected") ||
    msg.includes("action rejected") ||
    String(err?.code) === "4001"
  ) return "Transaction rejected by user.";

  if (msg.includes("insufficient funds for gas"))
    return "Insufficient funds for gas.";

  if (raw.includes("TransferHelper::transferFrom: transferFrom failed"))
    return "Insufficient allowance or balance.";

  if (msg.includes("deadline") || msg.includes("expired"))
    return "Transaction deadline exceeded.";

  return (err?.shortMessage || err?.message || "Transaction failed").toString();
}

export function useStakeActions(staking?: Address | null, lpToken?: Address | null) {
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const alerts = useAlerts();

  async function withFeeOverrides(base: any) {
    if (!wallet || !publicClient) throw new Error("Wallet/Public client missing");
    const account = wallet.account?.address as Address;
    const gas = await publicClient.estimateContractGas({ account, ...base });
    const gasWithBuffer = (gas * 115n) / 100n;
    return { ...base, account, gas: gasWithBuffer, gasPrice: GAS_PRICE };
  }

  // ---------- Approval LP (optionnelle si lpToken fourni) ----------
  async function ensureAllowanceLP(owner: Address, needed: bigint) {
    if (!lpToken) return; // rien à faire si pas de LP fourni
    const current = (await publicClient!.readContract({
      address: lpToken,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, staking as Address],
    })) as bigint;

    if (current >= needed) return;

    try {
      const base = {
        address: lpToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [staking as Address, maxUint256],
      } as const;
      const overrides = await withFeeOverrides(base);
      const hash = await wallet!.writeContract(overrides);

      alerts.push({
        kind: "approve:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `approve:${hash}`,
        message: "Approval sent…",
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "approve:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `approve:${hash}`,
        message: "Approval confirmed ✅",
      });
    } catch (e: any) {
      const pretty = prettifyStakingError(e);
      alerts.push({
        kind: "approve:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: () => ensureAllowanceLP(wallet!.account!.address as Address, needed),
        dedupeKey: `approveErr:${lpToken}:${staking}:${String(needed)}`,
      });
      throw e;
    }
  }

  // ---------- Actions staking avec alertes ----------
  async function stake(amount: bigint) {
    if (!staking || !wallet) {
      alerts.error("No staking or wallet");
      throw new Error("No staking or wallet");
    }

    try {
      // LP approve si fourni
      await ensureAllowanceLP(wallet.account!.address as Address, amount);

      const base = { address: staking, abi: abi.StakingRewards, functionName: "stake", args: [amount] } as const;
      const overrides = await withFeeOverrides(base);
      const hash = await wallet.writeContract(overrides);

      alerts.push({
        kind: "tx:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `stake:${hash}`,
        message: "Stake sent…",
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "tx:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `stake:${hash}`,
        message: "Staked ✅",
      });

      return receipt;
    } catch (e: any) {
      const pretty = prettifyStakingError(e);
      alerts.push({
        kind: "tx:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: async () => { await stake(amount); },
        dedupeKey: `stakeErr:${staking}:${String(amount)}`,
      });
      throw e;
    }
  }

  async function withdraw(amount: bigint) {
    if (!staking || !wallet) {
      alerts.error("No staking or wallet");
      throw new Error("No staking or wallet");
    }

    try {
      const base = { address: staking, abi: abi.StakingRewards, functionName: "withdraw", args: [amount] } as const;
      const overrides = await withFeeOverrides(base);
      const hash = await wallet.writeContract(overrides);

      alerts.push({
        kind: "tx:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `withdraw:${hash}`,
        message: "Withdraw sent…",
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "tx:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `withdraw:${hash}`,
        message: "Withdraw confirmed ✅",
      });

      return receipt;
    } catch (e: any) {
      const pretty = prettifyStakingError(e);
      alerts.push({
        kind: "tx:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: async () => { await withdraw(amount); },
        dedupeKey: `withdrawErr:${staking}:${String(amount)}`,
      });
      throw e;
    }
  }

  async function claim() {
    if (!staking || !wallet) {
      alerts.error("No staking or wallet");
      throw new Error("No staking or wallet");
    }

    try {
      const base = { address: staking, abi: abi.StakingRewards, functionName: "getReward" } as const;
      const overrides = await withFeeOverrides(base);
      const hash = await wallet.writeContract(overrides);

      alerts.push({
        kind: "tx:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `claim:${hash}`,
        message: "Claim sent…",
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "tx:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `claim:${hash}`,
        message: "Rewards claimed ✅",
      });

      return receipt;
    } catch (e: any) {
      const pretty = prettifyStakingError(e);
      alerts.push({
        kind: "tx:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: () => claim().then(() => {}),
        dedupeKey: `claimErr:${staking}`,
      });
      throw e;
    }
  }

  return { stake, withdraw, claim };
}
