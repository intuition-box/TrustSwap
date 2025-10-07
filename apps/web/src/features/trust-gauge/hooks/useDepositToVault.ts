// apps/web/src/features/trust-gauge/hooks/useDepositToVault.ts
// English-only comments
import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import type { Address } from "viem";
import { isHex, pad, toHex } from "viem";
import { deposit, MultiVaultAbi } from "@0xintuition/protocol";
import { CHAIN_ID, DEFAULT_CURVE_ID, MULTIVAULT_ADDRESS } from "../config";

type DepositArgs = {
  termId: `0x${string}` | string | bigint; // hex, decimal string, or bigint
  amountWei: bigint;                        // already in wei from the popup
  receiver?: Address | "self";              // defaults to "self"
  curveId?: number;                         // defaults to on-chain defaultCurveId (fallback DEFAULT_CURVE_ID)
  minShares?: bigint;                       // defaults to 1n for safety
};

type DepositMinArgs = {
  termId: `0x${string}` | string | bigint;
  receiver?: Address | "self";
  curveId?: number;
};

type DepositResult = { txHash: `0x${string}`; usedValueWei?: bigint };

const mvReadAbi = [
  // (uint256 shares, uint256 assetsAfterFees) previewDeposit(bytes32 termId, uint256 curveId, uint256 assets)
  {
    type: "function",
    name: "previewDeposit",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }, { type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
  },
  // optional: uint256 currentSharePrice(bytes32 termId, uint256 curveId)
  {
    type: "function",
    name: "currentSharePrice",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const mvWriteAbi = [
  // deposit(address receiver, bytes32 termId, uint256 curveId, uint256 minShares)
  {
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

  // Fetch on-chain defaultCurveId once
  useEffect(() => {
    if (!publicClient || !multivault) return;
    getDefaultCurveId(publicClient, multivault as `0x${string}`)
      .then(setCurveIdDefault)
      .catch(() => setCurveIdDefault(1n));
  }, [publicClient, multivault]);

  // Helper: preview shares for a given assets amount
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

  // Compute minimal accepted amount (≥1 share AND ≥ policy minimum). Returns minWei.
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
        const recv = receiver === "self" ? (address as Address) : (receiver as Address);
        const termId32 = normalizeTermId32(termId);
        const usedCurveId = BigInt(curveId ?? Number(curveIdDefault ?? 1n));

        // Optional seed via currentSharePrice
        let seed = 0n;
        try {
          seed = await publicClient.readContract({
            address: multivault,
            abi: mvReadAbi,
            functionName: "currentSharePrice",
            args: [termId32, usedCurveId],
          });
        } catch {}

        // Phase 1 — ensure ≥ 1 share
        const balance = await publicClient.getBalance({ address });
        const cap = (balance * 95n) / 100n;

        let value = seed > 0n ? seed : 10_000_000_000_000n; // ~1e13 wei start
        let shares = await previewShares(termId32, usedCurveId, value);
        let i = 0;

        while (shares === 0n && i++ < 20) {
          value = value === 0n ? 10_000_000_000_000n : value * 2n;
          if (value > cap) {
            const err: any = new Error("Insufficient balance to mint at least 1 share.");
            err.code = "INSUFFICIENT_BALANCE_FOR_MIN";
            err.requiredWei = value;
            err.balanceWei = balance;
            throw err;
          }
          shares = await previewShares(termId32, usedCurveId, value);
        }
        if (shares === 0n) {
          const err: any = new Error("Curve appears unseeded/inactive: 0 shares for large probes.");
          err.code = "CURVE_UNSEEDED";
          throw err;
        }

        // Phase 2 — ensure policy minimum: simulate until no BelowMinimumDeposit
        let attempts = 0;
        while (attempts++ < 20) {
          try {
            await publicClient.simulateContract({
              address: multivault,
              abi: mvWriteAbi,
              functionName: "deposit",
              account: address as `0x${string}`,
              args: [recv, termId32, usedCurveId, 1n],
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
    [publicClient, isConnected, address, multivault, activeChainId, chainId, switchChainAsync, previewShares, curveIdDefault]
  );

  // Deposit a user-provided exact amount (pre-simulate; if too low, return a rich error with requiredWei).
  const depositExact = useCallback(
    async ({
      termId,
      amountWei,
      receiver = "self",
      curveId,
      minShares = 1n,
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
        const recv = receiver === "self" ? (address as Address) : (receiver as Address);
        const termId32 = normalizeTermId32(termId);
        const usedCurveId = BigInt(curveId ?? Number(curveIdDefault ?? DEFAULT_CURVE_ID));

        // Balance check
        const bal = await publicClient.getBalance({ address });
        if (bal < amountWei) {
          const err: any = new Error(`Insufficient balance. Need ${amountWei.toString()} wei, have ${bal.toString()} wei.`);
          err.code = "INSUFFICIENT_BALANCE";
          err.requiredWei = amountWei;
          err.balanceWei = bal;
          throw err;
        }

        // Optional preflight: ensure ≥ 1 share
        try {
          const s = await previewShares(termId32, usedCurveId, amountWei);
          if (s === 0n && minShares > 0n) {
            const minWei = await getMinAcceptedDeposit({ termId, curveId: Number(usedCurveId), receiver: recv });
            const err: any = new Error("Amount would mint 0 shares. Use the suggested minimum.");
            err.code = "AMOUNT_BELOW_MIN";
            err.requiredWei = minWei;
            err.balanceWei = bal;
            throw err;
          }
        } catch {
          // ignore preview errors; simulate below will still catch policy minimum
        }

        // Pre-simulate to catch policy minimum
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

        return { txHash };
      } catch (e: any) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [publicClient, walletClient, isConnected, address, multivault, activeChainId, chainId, switchChainAsync, previewShares, getMinAcceptedDeposit, curveIdDefault]
  );

  // Button "MIN": compute minimal accepted value and deposit it with minShares=1
  const depositMin = useCallback(
    async ({
      termId,
      receiver = "self",
      curveId,
    }: DepositMinArgs): Promise<DepositResult> => {
      const recv = receiver === "self" ? (address as Address) : (receiver as Address);
      const minValue = await getMinAcceptedDeposit({ termId, curveId, receiver: recv });
      const res = await depositExact({ termId, amountWei: minValue, receiver: recv, curveId, minShares: 1n });
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
    loading,        // depositing state
    findingMin,     // computing min state
    error,
    // optional expose for debug/UI
    curveIdDefault: curveIdDefault ?? null,
  };
}
