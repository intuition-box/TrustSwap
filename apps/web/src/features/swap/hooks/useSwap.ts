import type { Address } from "viem";
import { erc20Abi, parseUnits, formatUnits } from "viem";
import { usePublicClient, useWalletClient, useChainId } from "wagmi";
import { getOrFetchToken } from "../../../lib/tokens";
import { abi, addresses } from "@trustswap/sdk";
import { useAlerts } from "../../../features/alerts/Alerts";

const NATIVE_PLACEHOLDER = addresses.NATIVE_PLACEHOLDER as Address; // tTRUST (pseudo "native")
const WNATIVE = addresses.WTTRUST as Address;                       // WTTRUST (wrapped)
const ROUTER = addresses.UniswapV2Router02 as Address;

const isNative = (addr?: Address) =>
  !!addr && addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

const isWrapped = (addr?: Address) =>
  !!addr && addr.toLowerCase() === WNATIVE.toLowerCase();

const eqAddr = (a?: Address, b?: Address) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

const toWrapped = (addr: Address) => (isNative(addr) ? WNATIVE : addr);
const buildPath = (path: Address[]) => path.map(toWrapped) as Address[];

function explorerTx(chainId: number | undefined, hash?: `0x${string}`) {
  if (!hash) return undefined;
  const map: Record<number, string> = {
    13579: "https://testnet.explorer.intuition.systems/tx/",
  };
  const base = map[chainId ?? 0];
  return base ? `${base}${hash}` : undefined;
}

function prettifySwapError(err: any): string {
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

  if (raw.includes("TransferHelper::transferFrom: transferFrom failed"))
    return "Insufficient allowance or balance for the input token.";

  if (
    raw.includes("INSUFFICIENT_OUTPUT_AMOUNT") ||
    raw.includes("ExcessiveInputAmount") ||
    msg.includes("insufficient output")
  ) return "Slippage too low (insufficient output).";

  if (msg.includes("deadline") || msg.includes("expired"))
    return "Transaction deadline exceeded.";

  if (raw.includes("Transfers restricted") || msg.includes("transfer restricted"))
    return "Token has transfer restrictions.";

  if (msg.includes("insufficient funds for gas"))
    return "Insufficient funds for gas.";

  if (msg.includes("nonce too low"))
    return "Nonce too low.";
  if (msg.includes("replacement transaction underpriced") || msg.includes("fee too low"))
    return "Replacement transaction underpriced.";

  return (err?.shortMessage || err?.message || "Swap failed").toString();
}

export function useSwap() {
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const alerts = useAlerts();

  const approveIfNeeded = async (token: Address, owner: Address, amount: bigint) => {
    if (!publicClient || !wallet) throw new Error("Wallet not connected");
    if (isNative(token)) return; // no approve for pseudo-native
    if (isWrapped(token)) return; // no approve needed for wrap/unwrap flows
    

    const allowance = (await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, ROUTER],
    })) as bigint;

    if (allowance >= amount) return;

    try {
      const hash = await wallet.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [ROUTER, amount],
      });

      alerts.push({
        kind: "approve:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `approve:${hash}`,
        message: "Approval sent",
      });

      await publicClient.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "approve:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `approve:${hash}`,
        message: "Approval confirmed ✅",
      });
    } catch (e: any) {
      const pretty = prettifySwapError(e);
      alerts.push({
        kind: "approve:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: () => approveIfNeeded(token, owner, amount),
        dedupeKey: `approveErr:${token}:${owner}:${String(amount)}`,
      });
      throw e;
    }
  };

  return async function swap(
    owner: Address,
    tokenIn: Address,
    tokenOut: Address,
    amountInStr: string,
    minOut: bigint,
    deadlineSec: number
  ) {
    if (!wallet) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("No public client");
    if (!tokenIn || !tokenOut) throw new Error("Missing token addresses");
    // Guard unsupported flows: TOKEN -> WTTRUST without a pool
    if (isWrapped(tokenOut) && !isNative(tokenIn)) {
      throw new Error(
        "Cannot swap directly to WTTRUST from non-native token. Swap to tTRUST first, then wrap to WTTRUST."
      );
    }


    // Allow native <-> wrapped as a valid "pair" even if addresses are effectively the same asset
    const sameAsset =
      (isNative(tokenIn) && isWrapped(tokenOut)) ||
      (isWrapped(tokenIn) && isNative(tokenOut));

    if (eqAddr(tokenIn, tokenOut) && !sameAsset) {
      throw new Error("Input and output token are identical");
    }

    if (isNative(tokenIn) && isNative(tokenOut)) {
      throw new Error("Native-to-native swap is not supported");
    }

    // Resolve decimals for input
    const [tIn, tOut] = await Promise.all([
      getOrFetchToken(toWrapped(tokenIn)),
      getOrFetchToken(toWrapped(tokenOut)),
    ]);
    const decimalsIn = isNative(tokenIn) ? 18 : Number(tIn.decimals ?? 18);
    const amountIn = parseUnits(amountInStr || "0", decimalsIn);
    if (amountIn <= 0n) throw new Error("Amount must be > 0");

    const deadline = BigInt(deadlineSec);

    try {
      let hash: `0x${string}`;

      // ===== Wrap / Unwrap special-cases (no router) =====
      if (isNative(tokenIn) && isWrapped(tokenOut)) {
        // Wrap: deposit native into WTTRUST
        hash = await wallet.writeContract({
          address: WNATIVE,
          abi: abi.WTTRUST, // must include deposit()/withdraw(uint256)
          functionName: "deposit",
          args: [],
          value: amountIn,
        });
      } else if (isWrapped(tokenIn) && isNative(tokenOut)) {
        // Unwrap: withdraw WTTRUST back to native
        hash = await wallet.writeContract({
          address: WNATIVE,
          abi: abi.WTTRUST,
          functionName: "withdraw",
          args: [amountIn],
        });
      }
      // ===== Router swaps (classic) =====
      else if (isNative(tokenIn) && !isNative(tokenOut)) {
        const path = buildPath([tokenIn, tokenOut]);
        hash = await wallet.writeContract({
          address: ROUTER,
          abi: abi.UniswapV2Router02,
          functionName: "swapExactETHForTokens",
          args: [minOut, path, owner, deadline],
          value: amountIn,
        });
      } else if (!isNative(tokenIn) && isNative(tokenOut)) {
        const path = buildPath([tokenIn, tokenOut]);
        await approveIfNeeded(tokenIn, owner, amountIn);
        hash = await wallet.writeContract({
          address: ROUTER,
          abi: abi.UniswapV2Router02,
          functionName: "swapExactTokensForETH",
          args: [amountIn, minOut, path, owner, deadline],
        });
      } else {
        const path = buildPath([tokenIn, tokenOut]);
        await approveIfNeeded(tokenIn, owner, amountIn);
        hash = await wallet.writeContract({
          address: ROUTER,
          abi: abi.UniswapV2Router02,
          functionName: "swapExactTokensForTokens",
          args: [amountIn, minOut, path, owner, deadline],
        });
      }

      alerts.push({
        kind: "tx:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `swap:${hash}`,
        message: "Transaction sent…",
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Friendly success message
      const labelIn = isNative(tokenIn) ? "tTRUST" : (tIn.symbol || "TOKEN");
      const labelOut = isNative(tokenOut) ? "tTRUST" : (tOut.symbol || "TOKEN");
      const shownMinOut = formatUnits(minOut, Number(tOut.decimals ?? 18));

      alerts.push({
        kind: "tx:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `swap:${hash}`,
        message: sameAsset
          ? `Wrapped/Unwrapped ${amountInStr} ${labelIn} ↔ ${labelOut}`
          : `Swapped ${amountInStr} ${labelIn} → ≥ ${shownMinOut} ${labelOut}`,
      });

      return receipt;
    } catch (e: any) {
      const pretty = prettifySwapError(e);
      alerts.push({
        kind: "tx:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: async () => {
          await swap(owner, tokenIn, tokenOut, amountInStr, minOut, deadlineSec);
        },
        dedupeKey: `swapErr:${tokenIn}:${tokenOut}:${amountInStr}:${minOut}`,
      });
      throw e;
    }
  };
}
