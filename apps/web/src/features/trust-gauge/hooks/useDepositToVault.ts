// apps/web/src/features/trust-gauge/hooks/useDepositToVault.ts
// English-only comments
import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import type { Address } from "viem";
import { isHex, pad, toHex } from "viem";
import { deposit, MultiVaultAbi } from "@0xintuition/protocol";
import { CHAIN_ID, DEFAULT_CURVE_ID, MULTIVAULT_ADDRESS } from "../config";
import { useTxAlerts, useAlerts } from "../../alerts/Alerts";

type DepositArgs = {
  termId: `0x${string}` | string | bigint; // hex, decimal string, or bigint
  amountWei: bigint;                        // already in wei from the popup
  receiver?: Address | "self";              // defaults to "self"
  curveId?: number;                         // defaults to resolved curve (prefers 2), else on-chain default, else fallback
  minShares?: bigint;                       // defaults to 0n (portal behavior)
};

type DepositMinArgs = {
  termId: `0x${string}` | string | bigint;
  receiver?: Address | "self";
  curveId?: number;
};

type DepositResult = { txHash: `0x${string}`; usedValueWei?: bigint };

const mvReadAbi = [
  {
    // (uint256 shares, uint256 assetsAfterFees) previewDeposit(bytes32 termId, uint256 curveId, uint256 assets)
    type: "function",
    name: "previewDeposit",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }, { type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
  },
  {
    // optional: uint256 currentSharePrice(bytes32 termId, uint256 curveId)
    type: "function",
    name: "currentSharePrice",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const mvWriteAbi = [
  {
    // deposit(address receiver, bytes32 termId, uint256 curveId, uint256 minShares)
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [
      { name: "receiver", type: "address" },
      { name: "termId", type: "bytes32" },
      { name: "curveId", type: "uint256" },
      { name: "minShares", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

function normalizeTermId32(x: `0x${string}` | string | bigint): `0x${string}` {
  if (typeof x === "bigint") return pad(toHex(x), { size: 32, dir: "left" }) as `0x${string}`;
  if (typeof x === "string" && isHex(x)) return pad(x as `0x${string}`, { size: 32, dir: "left" }) as `0x${string}`;
  const bn = BigInt(x as any);
  return pad(toHex(bn), { size: 32, dir: "left" }) as `0x${string}`;
}

function isBelowMinDeposit(e: any): boolean {
  const m = (e?.shortMessage || e?.message || "").toLowerCase();
  return m.includes("depositbelowminimumdeposit") || m.includes("below minimum deposit");
}

// Read defaultCurveId from contract; fallback to 1n if unavailable
export async function getDefaultCurveId(publicClient: any, multivault: `0x${string}`): Promise<bigint> {
  try {
    const res: any = await publicClient.readContract({
      address: multivault,
      abi: MultiVaultAbi,
      functionName: "getBondingCurveConfig",
      args: [],
    });
    const id = (res?.defaultCurveId ?? res?.[0] ?? 1n) as bigint;
    return id > 0n ? id : 1n;
  } catch {
    return 1n;
  }
}

// Prefer curveId=2 (portal behavior) if it accepts a tiny deposit; else on-chain default; else 1, then 0.
async function resolveCurveId(
  publicClient: any,
  multivault: `0x${string}`,
  account: `0x${string}`,
  termId32: `0x${string}`,
  curveIdDefault: bigint | null
): Promise<bigint> {
  const candidates = [2n, curveIdDefault ?? 0n, 1n, 0n]
    .filter((x, i, arr) => x !== null && arr.indexOf(x as bigint) === i) as bigint[];

  for (const cid of candidates) {
    try {
      await publicClient.simulateContract({
        address: multivault,
        abi: mvWriteAbi,
        functionName: "deposit",
        account,
        args: [account, termId32, cid, 0n],  // minShares=0 (portal behavior)
        value: 1_000_000_000_000_000n,      // 0.001 tTRUST
      });
      return cid;
    } catch {
      // try next
    }
  }
  return curveIdDefault ?? 1n;
}

export function useDepositToVault(params?: { chainId?: number; multivault?: Address }) {
  const chainId = params?.chainId ?? CHAIN_ID;
  const multivault = (params?.multivault ?? MULTIVAULT_ADDRESS) as Address;

  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient();
  const { address, isConnected, chainId: activeChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [loading, setLoading] = useState(false);
  const [findingMin, setFindingMin] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [curveIdDefault, setCurveIdDefault] = useState<bigint | null>(null);

  const txAlerts = useTxAlerts();
  const alerts = useAlerts(); // for non-tx warnings (e.g., user cancelled)

  // Fetch on-chain defaultCurveId once
  useEffect(() => {
    if (!publicClient || !multivault) return;
    getDefaultCurveId(publicClient, multivault as `0x${string}`)
      .then(setCurveIdDefault)
      .catch(() => setCurveIdDefault(1n));
  }, [publicClient, multivault]);

  // Helper: preview shares for a given assets amount (only for warnings)
  const previewShares = useCallback(
    async (termId32: `0x${string}`, curveIdBn: bigint, amt: bigint) => {
      try {
        const [shares] = await publicClient!.readContract({
          address: multivault,
          abi: mvReadAbi,
          functionName: "previewDeposit",
          args: [termId32, curveIdBn, amt],
        });
        return shares as bigint;
      } catch {
        return 0n;
      }
    },
    [publicClient, multivault]
  );

  // Compute minimal accepted amount (policy-only, like the portal): minShares=0, bump until BelowMinimumDeposit disappears.
  const getMinAcceptedDeposit = useCallback(
    async ({
      termId,
      curveId,
      receiver = "self",
    }: DepositMinArgs): Promise<bigint> => {
      if (!publicClient) throw new Error("Missing public client");
      if (!isConnected || !address) throw new Error("Wallet not connected");
      if (!multivault) throw new Error("Missing MultiVault address");

      if (activeChainId !== chainId && switchChainAsync) {
        await switchChainAsync({ chainId });
      }

      setFindingMin(true);
      setError(null);

      try {
        const recv = (receiver === "self" ? address : receiver) as `0x${string}`;
        const termId32 = normalizeTermId32(termId);
        const usedCurveId = BigInt(
          curveId ?? Number(await resolveCurveId(publicClient, multivault as `0x${string}`, address as `0x${string}`, termId32, curveIdDefault))
        );

        const balance = await publicClient.getBalance({ address });
        const cap = (balance * 95n) / 100n;

        // Start from 0.001 tTRUST and bump until policy accepts it (minShares=0)
        let value = 1_000_000_000_000_000n; // 0.001
        let attempts = 0;

        while (attempts++ < 20) {
          try {
            await publicClient.simulateContract({
              address: multivault,
              abi: mvWriteAbi,
              functionName: "deposit",
              account: address as `0x${string}`,
              args: [recv, termId32, usedCurveId, 0n], // minShares=0
              value,
            });
            break; // success
          } catch (e: any) {
            if (isBelowMinDeposit(e)) {
              value = value * 2n;
              if (value > cap) {
                const err: any = new Error("Minimum deposit exceeds available balance.");
                err.code = "INSUFFICIENT_BALANCE_FOR_MIN";
                err.requiredWei = value;
                err.balanceWei = balance;
                throw err;
              }
              continue;
            }
            throw e;
          }
        }

        const buffer = value / 100n + 1n; // +1% + 1 wei
        return value + buffer;
      } finally {
        setFindingMin(false);
      }
    },
    [publicClient, isConnected, address, multivault, activeChainId, chainId, switchChainAsync, curveIdDefault]
  );

  // Deposit a user-provided exact amount; default minShares=0 (portal behavior) + alerts integration.
  const depositExact = useCallback(
    async ({
      termId,
      amountWei,
      receiver = "self",
      curveId,
      minShares = 0n,
    }: DepositArgs): Promise<DepositResult> => {
      if (!publicClient) throw new Error("Missing public client");
      if (!walletClient) throw new Error("Missing wallet client");
      if (!isConnected || !address) throw new Error("Wallet not connected");
      if (!multivault) throw new Error("Missing MultiVault address");
      if (!amountWei || amountWei <= 0n) throw new Error("Amount must be greater than zero.");

      if (activeChainId !== chainId && switchChainAsync) {
        await switchChainAsync({ chainId });
      }

      setLoading(true);
      setError(null);

      try {
        const recv = (receiver === "self" ? address : receiver) as `0x${string}`;
        const termId32 = normalizeTermId32(termId);
        const usedCurveId = BigInt(
          curveId ?? Number(await resolveCurveId(publicClient, multivault as `0x${string}`, address as `0x${string}`, termId32, curveIdDefault ?? BigInt(DEFAULT_CURVE_ID)))
        );

        // Balance check
        const bal = await publicClient.getBalance({ address });
        if (bal < amountWei) {
          const err: any = new Error(`Insufficient balance. Need ${amountWei.toString()} wei, have ${bal.toString()} wei.`);
          err.code = "INSUFFICIENT_BALANCE";
          err.requiredWei = amountWei;
          err.balanceWei = bal;
          throw err;
        }

        // Optional warning: if caller explicitly asked for ≥1 share (minShares>0), hint a suggested minimum
        try {
          if (minShares > 0n) {
            const s = await previewShares(termId32, usedCurveId, amountWei);
            if (s === 0n) {
              const minWei = await getMinAcceptedDeposit({ termId, curveId: Number(usedCurveId), receiver: recv });
              const err: any = new Error("Amount would mint 0 shares. Use the suggested minimum.");
              err.code = "AMOUNT_BELOW_MIN";
              err.requiredWei = minWei;
              err.balanceWei = bal;
              throw err;
            }
          }
        } catch {
          // ignore preview errors; simulate below catches policy minimum anyway
        }

        // Pre-simulate to catch policy minimum (BelowMinimumDeposit)
        try {
          await publicClient.simulateContract({
            address: multivault,
            abi: mvWriteAbi,
            functionName: "deposit",
            account: address as `0x${string}`,
            args: [recv, termId32, usedCurveId, minShares],
            value: amountWei,
          });
        } catch (e: any) {
          if (isBelowMinDeposit(e)) {
            const minWei = await getMinAcceptedDeposit({ termId, curveId: Number(usedCurveId), receiver: recv });
            const err: any = new Error("Amount below contract minimum.");
            err.code = "AMOUNT_BELOW_MIN";
            err.requiredWei = minWei;
            err.balanceWei = bal;
            throw err;
          }
          throw e;
        }

        // Send tx
        const txHash = await deposit(
          { address: multivault, walletClient, publicClient },
          { args: [recv, termId32, usedCurveId, minShares], value: amountWei }
        );

        // Alert: pending (broadcasted)
        txAlerts.onSubmit(txHash, /* explorerUrl */ undefined, chainId);

        // Wait for confirmation then alert accordingly
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === "success") {
          txAlerts.onSuccess(txHash, /* explorerUrl */ undefined, chainId);
        } else {
          txAlerts.onError(txHash, "Transaction reverted");
        }

        return { txHash };
      } catch (e: any) {
        // Map common cancel/reject to a friendly warning toast
        const msg = String(e?.shortMessage || e?.message || e);
        if (e?.code === 4001 || /user rejected|user denied|request rejected/i.test(msg)) {
          alerts.warn("Transaction cancelled by user.");
        } else {
          txAlerts.onError(undefined, msg, () => {
            // retry callback with the same args if desired
            // no-op by default
          });
        }
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [
      publicClient,
      walletClient,
      isConnected,
      address,
      multivault,
      activeChainId,
      chainId,
      switchChainAsync,
      previewShares,
      getMinAcceptedDeposit,
      curveIdDefault,
      txAlerts,
      alerts,
    ]
  );

  // Button "MIN": compute minimal accepted value (policy-only, minShares=0) and deposit it
  const depositMin = useCallback(
    async ({
      termId,
      receiver = "self",
      curveId,
    }: DepositMinArgs): Promise<DepositResult> => {
      const recv = receiver === "self" ? (address as Address) : (receiver as Address);
      const minValue = await getMinAcceptedDeposit({ termId, curveId, receiver: recv });
      const res = await depositExact({ termId, amountWei: minValue, receiver: recv, curveId, minShares: 0n });
      return { ...res, usedValueWei: minValue };
    },
    [getMinAcceptedDeposit, depositExact, address]
  );

  return {
    // actions
    depositExact,
    depositMin,
    getMinAcceptedDeposit,
    // state
    loading,
    findingMin,
    error,
    // debug
    curveIdDefault: curveIdDefault ?? null,
  };
}
