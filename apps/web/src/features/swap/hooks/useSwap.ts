import type { Address } from "viem";
import { erc20Abi, parseUnits, formatUnits } from "viem";
import { usePublicClient, useWalletClient, useChainId } from "wagmi";
import { getTokenByAddress } from "../../../lib/tokens";
import { abi, addresses } from "@trustswap/sdk";
import { useAlerts } from "../../../features/alerts/Alerts";

// Placeholder “native” (tTRUST)
const NATIVE_PLACEHOLDER = addresses.NATIVE_PLACEHOLDER as Address;
// WTTRUST (wrapped)
const WNATIVE = addresses.WTTRUST as Address;
// Router
const ROUTER = addresses.UniswapV2Router02 as Address;

const isNative = (addr?: Address) =>
  !!addr && addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

const toWrapped = (addr: Address) => (isNative(addr) ? WNATIVE : addr);
const buildPath = (path: Address[]) => path.map(toWrapped) as Address[];

// lire les décimales (18 si natif)
function getDecimals(addr: Address): number {
  if (isNative(addr)) return 18;
  try {
    return getTokenByAddress(addr).decimals ?? 18;
  } catch {
    return 18;
  }
}

// URL explorer (complète la map si nécessaire)
function explorerTx(chainId: number | undefined, hash?: `0x${string}`) {
  if (!hash) return undefined;
  const map: Record<number, string> = {
    13579: "https://testnet.explorer.intuition.systems/tx/",
  };
  const base = map[chainId ?? 0];
  return base ? `${base}${hash}` : undefined;
}

// Messages d’erreur plus parlants
function prettifySwapError(err: any): string {
  // Try to gather as much context as possible
  const raw =
    String(err?.shortMessage || "") + " | " +
    String(err?.message || "") + " | " +
    String(err?.cause?.shortMessage || "") + " | " +
    String(err?.cause?.message || "");
  const msg = raw.toLowerCase();

  // User rejected
  if (
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("request rejected") ||
    msg.includes("action rejected") ||
    String(err?.code) === "4001"
  ) return "Transaction rejected by user.";

  // ERC20 transferFrom / allowance
  if (raw.includes("TransferHelper::transferFrom: transferFrom failed"))
    return "Insufficient allowance or balance for the input token.";

  // Slippage / output amount
  if (
    raw.includes("INSUFFICIENT_OUTPUT_AMOUNT") ||
    raw.includes("ExcessiveInputAmount") ||
    msg.includes("insufficient output")
  ) return "Slippage too low (insufficient output).";

  // Deadline
  if (msg.includes("deadline") || msg.includes("expired"))
    return "Transaction deadline exceeded.";

  // Transfer restrictions / blacklist / fees
  if (raw.includes("Transfers restricted") || msg.includes("transfer restricted"))
    return "Token has transfer restrictions.";

  // Gas / funds
  if (msg.includes("insufficient funds for gas"))
    return "Insufficient funds for gas.";

  // Nonce / replacement
  if (msg.includes("nonce too low"))
    return "Nonce too low.";
  if (msg.includes("replacement transaction underpriced") || msg.includes("fee too low"))
    return "Replacement transaction underpriced.";

  // Fallback
  return (err?.shortMessage || err?.message || "Swap failed").toString();
}

export function useSwap() {
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const alerts = useAlerts();

  // Enrobe une tx d’approve avec alertes
  const approveIfNeeded = async (token: Address, owner: Address, amount: bigint) => {
    if (!publicClient || !wallet) throw new Error("Wallet not connected");
    if (isNative(token)) return;

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
    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
      throw new Error("Input and output token are identical");
    }
    if (isNative(tokenIn) && isNative(tokenOut)) {
      throw new Error("Native-to-native swap is not supported");
    }

    const tIn = getTokenByAddress(toWrapped(tokenIn));
    const tOut = getTokenByAddress(toWrapped(tokenOut));

    const decimalsIn = getDecimals(tokenIn);
    const amountIn = parseUnits(amountInStr || "0", decimalsIn);
    if (amountIn <= 0n) throw new Error("Amount must be > 0");

    const deadline = BigInt(deadlineSec);

    try {
      let hash: `0x${string}`;

      // 1) NATIF -> TOKEN
      if (isNative(tokenIn) && !isNative(tokenOut)) {
        const path = buildPath([tokenIn, tokenOut]); // [WTTRUST, tokenOut]
        hash = await wallet.writeContract({
          address: ROUTER,
          abi: abi.UniswapV2Router02,
          functionName: "swapExactETHForTokens",
          args: [minOut, path, owner, deadline],
          value: amountIn,
        });
      }
      // 2) TOKEN -> NATIF
      else if (!isNative(tokenIn) && isNative(tokenOut)) {
        const path = buildPath([tokenIn, tokenOut]); // [tokenIn, WTTRUST]
        await approveIfNeeded(tokenIn, owner, amountIn);
        hash = await wallet.writeContract({
          address: ROUTER,
          abi: abi.UniswapV2Router02,
          functionName: "swapExactTokensForETH",
          args: [amountIn, minOut, path, owner, deadline],
        });
      }
      // 3) TOKEN -> TOKEN
      else {
        const path = buildPath([tokenIn, tokenOut]); // [tokenIn, tokenOut] (wrap si natif)
        await approveIfNeeded(tokenIn, owner, amountIn);
        hash = await wallet.writeContract({
          address: ROUTER,
          abi: abi.UniswapV2Router02,
          functionName: "swapExactTokensForTokens",
          args: [amountIn, minOut, path, owner, deadline],
        });
      }

      // pending
      alerts.push({
        kind: "tx:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `swap:${hash}`,
        message: "Swap envoyé…",
      });

      // wait + success
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "tx:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `swap:${hash}`,
        message: `Swapped ${amountInStr} ${tIn.symbol} → ≥ ${formatUnits(minOut, tOut.decimals)} ${tOut.symbol}`,
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
