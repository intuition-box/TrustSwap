// apps/web/src/features/pools/hooks/useLiquidityActions.ts
import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import type { Address, Abi } from "viem";
import { erc20Abi, maxUint256, parseGwei, zeroAddress } from "viem";
import { addresses } from "@trustswap/sdk";
import { useAlerts } from "../../../features/alerts/Alerts";
import { useTokenModule } from "../../../hooks/useTokenModule";

// --- Réseau / addresses
const ROUTER = addresses.UniswapV2Router02 as Address;
const FACTORY = addresses.UniswapV2Factory as Address;

// --- Gas policy (testnet): ~0.1 gwei
const GAS_PRICE = parseGwei("0.1");

// --- ABIs minimales & typées -----------------------------------------------------------------
const WETH9_DEPOSIT_ABI = [
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
] as const satisfies Abi;

// --- ABIs -------------------------------------------------------------------
const ROUTER_ABI_LIQ = [
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "removeLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
    ],
  },
] as const satisfies Abi;

const ROUTER_ABI_ETH = [
  {
    type: "function",
    name: "removeLiquidityETH",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountETHMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountToken", type: "uint256" },
      { name: "amountETH", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "removeLiquidityETHSupportingFeeOnTransferTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountETHMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountETH", type: "uint256" }],
  },
] as const satisfies Abi;

const FACTORY_ABI = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
] as const satisfies Abi;
// --------------------------------------------------------------------------------------------

// Explorer URL (complète avec tes réseaux)
function explorerTx(chainId: number | undefined, hash?: `0x${string}`) {
  if (!hash) return undefined;
  const map: Record<number, string> = {
    13579: "https://testnet.explorer.intuition.systems/tx/",
  };
  const base = map[chainId ?? 0];
  return base ? `${base}${hash}` : undefined;
}

// Messages d’erreur (EN)
function prettifyLiquidityError(err: any): string {
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

  if (msg.includes("pair") && msg.includes("not found"))
    return "Pair not found for provided tokens.";

  if (msg.includes("lp") && msg.includes("balance") && msg.includes("zero"))
    return "You do not hold LP tokens for this pool.";

  return (err?.shortMessage || err?.message || "Transaction failed").toString();
}

export function useLiquidityActions() {
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const alerts = useAlerts();
  const { toWrapped, WNATIVE_ADDRESS } = useTokenModule();

  async function estimateOverrides<TAbi extends Abi, TFn extends string>(base: {
    address: Address;
    abi: TAbi;
    functionName: TFn;
    args?: readonly unknown[];
    value?: bigint;
  }) {
    if (!wallet || !publicClient) throw new Error("Wallet/Public client missing");
    const account = wallet.account!.address as Address;
    const gas = await publicClient.estimateContractGas({ account, ...base });
    const gasWithBuffer = (gas * 115n) / 100n;
    return { gas: gasWithBuffer, gasPrice: GAS_PRICE };
  }

  async function readBalance(token: Address, owner: Address): Promise<bigint> {
    return (publicClient!.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    }) as unknown) as bigint;
  }

  // Approval avec alertes
  async function ensureAllowance(
    token: Address,
    owner: Address,
    spender: Address,
    needed: bigint
  ) {
    const current = (await publicClient!.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, spender],
    })) as unknown as bigint;

    if (current >= needed) return;

    try {
      const base = {
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, maxUint256],
      } as const;
      const overrides = await estimateOverrides(base);
      const hash = await wallet!.writeContract({ ...base, ...overrides });

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
      const pretty = prettifyLiquidityError(e);
      alerts.push({
        kind: "approve:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: () => ensureAllowance(token, owner, spender, needed),
        dedupeKey: `approveErr:${token}:${owner}:${String(needed)}`,
      });
      throw e;
    }
  }

  // WTRUST = vrai wrapped natif (avec alertes)
  async function wrapNative(amount: bigint) {
    try {
      const base = {
        address: WNATIVE_ADDRESS,
        abi: WETH9_DEPOSIT_ABI,
        functionName: "deposit",
        value: amount,
      } as const;
      const overrides = await estimateOverrides(base);
      const hash = await wallet!.writeContract({ ...base, ...overrides });

      alerts.push({
        kind: "tx:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `wrap:${hash}`,
        message: "Wrapping native…",
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "tx:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `wrap:${hash}`,
        message: "Wrapped native ✅",
      });
    } catch (e: any) {
      const pretty = prettifyLiquidityError(e);
      alerts.push({
        kind: "tx:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: () => wrapNative(amount),
        dedupeKey: `wrapErr:${String(amount)}`,
      });
      throw e;
    }
  }

  async function addLiquidity(
    tokenA: Address,
    tokenB: Address,
    amtADesired: bigint,
    amtBDesired: bigint,
    amtAMin: bigint,
    amtBMin: bigint,
    to: Address,
    deadlineSec: number
  ) {
    if (!wallet) {
      alerts.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    const A = toWrapped(tokenA);
    const B = toWrapped(tokenB);
    const owner = wallet.account!.address as Address;

    try {
      // Balances & wrap auto si besoin
      const [balA, balB] = await Promise.all([readBalance(A, owner), readBalance(B, owner)]);
      if (A.toLowerCase() === WNATIVE_ADDRESS.toLowerCase() && balA < amtADesired) {
        await wrapNative(amtADesired - balA);
      }
      if (B.toLowerCase() === WNATIVE_ADDRESS.toLowerCase() && balB < amtBDesired) {
        await wrapNative(amtBDesired - balB);
      }

      // Approvals ERC20 vers le Router
      await ensureAllowance(A, owner, ROUTER, amtADesired);
      await ensureAllowance(B, owner, ROUTER, amtBDesired);

      // Appel Router (ABI LIQ)
      const base = {
        address: ROUTER,
        abi: ROUTER_ABI_LIQ,
        functionName: "addLiquidity",
        args: [A, B, amtADesired, amtBDesired, amtAMin, amtBMin, to, BigInt(deadlineSec)],
      } as const;
      const overrides = await estimateOverrides(base);
      const hash = await wallet!.writeContract({ ...base, ...overrides });

      alerts.push({
        kind: "tx:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `addliq:${hash}`,
        message: "Add liquidity sent…",
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "tx:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `addliq:${hash}`,
        message: "Liquidity added ✅",
      });

      return receipt;
    } catch (e: any) {
      const pretty = prettifyLiquidityError(e);
      alerts.push({
        kind: "tx:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: async () => {
          await addLiquidity(tokenA, tokenB, amtADesired, amtBDesired, amtAMin, amtBMin, to, deadlineSec);
        },
      });
      throw e;
    }
  }

  async function removeLiquidity(
    tokenA: Address,
    tokenB: Address,
    liquidity: bigint,
    amtAMin: bigint,
    amtBMin: bigint,
    to: Address,
    deadlineSec: number
  ) {
    if (!wallet) {
      alerts.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }
    const owner = wallet.account!.address as Address;

    try {
      // On travaille toujours en wrapped pour trouver la pair & allowances
      const A = toWrapped(tokenA);
      const B = toWrapped(tokenB);

      const pair = (await publicClient!.readContract({
        address: FACTORY,
        abi: FACTORY_ABI,
        functionName: "getPair",
        args: [A, B],
      })) as Address;

      if (!pair || pair === zeroAddress) {
        const msg = "Pair not found for provided tokens.";
        alerts.error(msg);
        throw new Error(msg);
      }

      // Solde LP & approval du LP vers le Router
      const lpBalance = (await publicClient!.readContract({
        address: pair,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
      })) as unknown as bigint;

      if (lpBalance === 0n) {
        const msg = "You do not hold LP tokens for this pool.";
        alerts.error(msg);
        throw new Error(msg);
      }

      const liq = liquidity > lpBalance ? lpBalance : liquidity;
      await ensureAllowance(pair, owner, ROUTER, liq);

      const isA_W = A.toLowerCase() === WNATIVE_ADDRESS.toLowerCase();
      const isB_W = B.toLowerCase() === WNATIVE_ADDRESS.toLowerCase();

      let hash: `0x${string}`;

      if (isA_W || isB_W) {
        const token = isA_W ? B : A;
        const amountTokenMin = isA_W ? amtBMin : amtAMin;
        const amountETHMin   = isA_W ? amtAMin : amtBMin;

        const baseEth = {
          address: ROUTER,
          abi: ROUTER_ABI_ETH,
          functionName: "removeLiquidityETH",
          args: [token, liq, amountTokenMin, amountETHMin, to, BigInt(deadlineSec)],
        } as const;

        const overrides = await estimateOverrides(baseEth);
        hash = await wallet!.writeContract({ ...baseEth, ...overrides });
      } else {
        // ERC20 ↔ ERC20
        const baseErc20 = {
          address: ROUTER,
          abi: ROUTER_ABI_LIQ,
          functionName: "removeLiquidity",
          args: [A, B, liq, amtAMin, amtBMin, to, BigInt(deadlineSec)],
        } as const;

        const overrides = await estimateOverrides(baseErc20);
        hash = await wallet!.writeContract({ ...baseErc20, ...overrides });
      }

      alerts.push({
        kind: "tx:pending",
        txHash: hash,
        severity: "info",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `remlig:${hash}`,
        message: "Remove liquidity sent…",
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      alerts.push({
        kind: "tx:confirmed",
        txHash: hash,
        severity: "success",
        explorer: { url: explorerTx(chainId, hash) ?? "" },
        dedupeKey: `remlig:${hash}`,
        message: "Liquidity removed ✅",
      });

      return receipt;
    } catch (e: any) {
      const pretty = prettifyLiquidityError(e);
      alerts.push({
        kind: "tx:failed",
        severity: "error",
        message: pretty,
        asModal: true,
        sticky: true,
        retry: async () => {
          await removeLiquidity(tokenA, tokenB, liquidity, amtAMin, amtBMin, to, deadlineSec);
        },
      });
      throw e;
    }
  }

  return { addLiquidity, removeLiquidity, wrapNative };
}
