// apps/web/src/features/pools/hooks/useLiquidityActions.ts
import { useWalletClient, usePublicClient } from "wagmi";
import type { Address, Abi } from "viem";
import { erc20Abi, maxUint256, parseGwei, zeroAddress } from "viem";
import { addresses } from "@trustswap/sdk";
import { toWrapped, WNATIVE_ADDRESS } from "../../../lib/tokens";

// --- Réseau / addresses
const ROUTER = addresses.UniswapV2Router02 as Address;
const FACTORY = addresses.UniswapV2Factory as Address;

// --- Gas policy (testnet): ~0.1 gwei
const GAS_PRICE = parseGwei("0.1");

// --- ABIs minimales & typées -----------------------------------------------------------------
const WETH9_DEPOSIT_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const satisfies Abi;

const ROUTER_ABI = [
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

export function useLiquidityActions() {
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();

  async function estimateOverrides(base: {
    address: Address;
    abi: Abi;
    functionName: string;
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

    const base = {
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, maxUint256],
    } as const;
    const overrides = await estimateOverrides(base);
    const hash = await wallet!.writeContract({ ...base, ...overrides });
    await publicClient!.waitForTransactionReceipt({ hash });
  }

  // WTTRUST = vrai wrapped natif
  async function wrapNative(amount: bigint) {
    const base = {
      address: WNATIVE_ADDRESS,
      abi: WETH9_DEPOSIT_ABI,
      functionName: "deposit",
      // payable
      value: amount,
    } as const;
    const overrides = await estimateOverrides(base);
    const hash = await wallet!.writeContract({ ...base, ...overrides });
    await publicClient!.waitForTransactionReceipt({ hash });
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
    if (!wallet) throw new Error("Wallet not connected");

    // Toujours travailler en wrapped (WTTRUST)
    const A = toWrapped(tokenA);
    const B = toWrapped(tokenB);
    const owner = wallet.account!.address as Address;

    // Balances & wrap auto si besoin
    const [balA, balB] = await Promise.all([
      readBalance(A, owner),
      readBalance(B, owner),
    ]);
    if (A.toLowerCase() === WNATIVE_ADDRESS.toLowerCase() && balA < amtADesired) {
      await wrapNative(amtADesired - balA);
    }
    if (B.toLowerCase() === WNATIVE_ADDRESS.toLowerCase() && balB < amtBDesired) {
      await wrapNative(amtBDesired - balB);
    }

    // Approvals ERC20 vers le Router
    await ensureAllowance(A, owner, ROUTER, amtADesired);
    await ensureAllowance(B, owner, ROUTER, amtBDesired);

    // Appel Router
    const base = {
      address: ROUTER,
      abi: ROUTER_ABI,
      functionName: "addLiquidity",
      args: [A, B, amtADesired, amtBDesired, amtAMin, amtBMin, to, BigInt(deadlineSec)],
    } as const;
    const overrides = await estimateOverrides(base);
    return wallet!.writeContract({ ...base, ...overrides });
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
    if (!wallet) throw new Error("Wallet not connected");
    const owner = wallet.account!.address as Address;

    // Wrapped + pair address
    const A = toWrapped(tokenA);
    const B = toWrapped(tokenB);

    const pair = (await publicClient!.readContract({
      address: FACTORY,
      abi: FACTORY_ABI,
      functionName: "getPair",
      args: [A, B],
    })) as Address;

    if (!pair || pair === zeroAddress) {
      throw new Error("Pair not found for provided tokens.");
    }

    // Solde LP & approval du LP vers le Router
    const lpBalance = (await publicClient!.readContract({
      address: pair,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    })) as unknown as bigint;

    if (lpBalance === 0n) {
      throw new Error("You do not hold LP tokens for this pool.");
    }

    const liq = liquidity > lpBalance ? lpBalance : liquidity;
    await ensureAllowance(pair, owner, ROUTER, liq);

    const base = {
      address: ROUTER,
      abi: ROUTER_ABI,
      functionName: "removeLiquidity",
      args: [A, B, liq, amtAMin, amtBMin, to, BigInt(deadlineSec)],
    } as const;
    const overrides = await estimateOverrides(base);
    return wallet!.writeContract({ ...base, ...overrides });
  }

  return { addLiquidity, removeLiquidity, wrapNative };
}
