import type { Address } from "viem";
import { erc20Abi, parseUnits } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { getTokenByAddress } from "../../../lib/tokens";
import { abi, addresses } from "@trustswap/sdk";
import { useLiveTriggerAll } from "../../../live/LiveRefetchProvider";

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

//  read the decimales (18 si natif)
function getDecimals(addr: Address): number {
  if (isNative(addr)) return 18;
  try {
    return getTokenByAddress(addr).decimals ?? 18;
  } catch {
    return 18;
  }
}

export function useSwap() {
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();
  const triggerAll = useLiveTriggerAll();

  const approveIfNeeded = async (token: Address, owner: Address, amount: bigint) => {
    if (isNative(token)) return; 

    // allowance(owner -> ROUTER)
    const allowance = await publicClient!.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, ROUTER],
    }) as bigint;

    if (allowance < amount) {
      await wallet!.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [ROUTER, amount], 
      });
      await publicClient!.waitForTransactionReceipt({ hash: tx });
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
    if (!tokenIn || !tokenOut) throw new Error("Missing token addresses");
    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
      throw new Error("Input and output token are identical");
    }
    if (isNative(tokenIn) && isNative(tokenOut)) {
      throw new Error("Native-to-native swap is not supported");
    }

    const decimalsIn = getDecimals(tokenIn);
    const amountIn = parseUnits(amountInStr || "0", decimalsIn);
    if (amountIn <= 0n) throw new Error("Amount must be > 0");

    const deadline = BigInt(deadlineSec);

    // 1) NATIF -> TOKEN
    if (isNative(tokenIn) && !isNative(tokenOut)) {
      const path = buildPath([tokenIn, tokenOut]); // transform [WTTRUST, tokenOut]
      return wallet.writeContract({
        address: ROUTER,
        abi: abi.UniswapV2Router02,
        functionName: "swapExactETHForTokens",
        args: [minOut, path, owner, deadline],
        value: amountIn,
      });
    }

    // 2) TOKEN -> NATIF
    if (!isNative(tokenIn) && isNative(tokenOut)) {
      const path = buildPath([tokenIn, tokenOut]); // [tokenIn, WTTRUST]
      await approveIfNeeded(tokenIn, owner, amountIn);
      return wallet.writeContract({
        address: ROUTER,
        abi: abi.UniswapV2Router02,
        functionName: "swapExactTokensForETH",
        args: [amountIn, minOut, path, owner, deadline],
      });
    }

    // 3) TOKEN -> TOKEN
    const path = buildPath([tokenIn, tokenOut]);
    await approveIfNeeded(tokenIn, owner, amountIn);
    return wallet.writeContract({
      address: ROUTER,
      abi: abi.UniswapV2Router02,
      functionName: "swapExactTokensForTokens",
      args: [amountIn, minOut, path, owner, deadline],
    });

    await publicClient!.waitForTransactionReceipt({ hash });
    triggerAll();

    return hash;
  };
}
