import { useWalletClient, usePublicClient } from "wagmi";
import type { Address, Abi } from "viem";
import { abi, addresses } from "@trustswap/sdk";
import { erc20Abi, maxUint256, parseGwei } from "viem";
import { toWrapped, WNATIVE_ADDRESS } from "../../../lib/tokens";

const GAS_PRICE = parseGwei("0.1");
const ROUTER = addresses.UniswapV2Router02 as Address;

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
    return publicClient!.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] }) as Promise<bigint>;
  }

  async function ensureAllowance(token: Address, owner: Address, spender: Address, needed: bigint) {
    const current: bigint = await publicClient!.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [owner, spender] }) as any;
    if (current >= needed) return;

    const base = {
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, maxUint256],
    } as const; // ← garde "approve" en littéral

    const overrides = await estimateOverrides(base);
    const hash = await wallet!.writeContract({ ...base, ...overrides }); // pas d'"account" ici
    await publicClient!.waitForTransactionReceipt({ hash });
  }

  async function wrapNative(amount: bigint) {
    const base = {
      address: WNATIVE_ADDRESS,
      abi: abi.WTTRUST,           // ajuste si différent
      functionName: "deposit",
      // @ts-expect-error value est supporté à l’exec
      value: amount,
    } as const;

    const overrides = await estimateOverrides(base);
    const hash = await wallet!.writeContract({ ...base, ...overrides });
    await publicClient!.waitForTransactionReceipt({ hash });
  }

  async function addLiquidity(
    tokenA: Address, tokenB: Address,
    amtADesired: bigint, amtBDesired: bigint,
    amtAMin: bigint, amtBMin: bigint,
    to: Address, deadlineSec: number
  ) {
    if (!wallet) throw new Error("Wallet not connected");

    const A = toWrapped(tokenA);
    const B = toWrapped(tokenB);
    const owner = wallet.account!.address as Address;

    // balances + wrap auto si besoin
    const [balA, balB] = await Promise.all([readBalance(A, owner), readBalance(B, owner)]);
    if (balA < amtADesired && A.toLowerCase() === WNATIVE_ADDRESS.toLowerCase()) await wrapNative(amtADesired - balA);
    if (balB < amtBDesired && B.toLowerCase() === WNATIVE_ADDRESS.toLowerCase()) await wrapNative(amtBDesired - balB);

    await ensureAllowance(A, owner, ROUTER, amtADesired);
    await ensureAllowance(B, owner, ROUTER, amtBDesired);

    const base = {
      address: ROUTER,
      abi: abi.UniswapV2Router02,
      functionName: "addLiquidity",
      args: [A, B, amtADesired, amtBDesired, amtAMin, amtBMin, to, BigInt(deadlineSec)],
    } as const;

    const overrides = await estimateOverrides(base);
    return wallet.writeContract({ ...base, ...overrides });
  }

  async function removeLiquidity(
    tokenA: Address, tokenB: Address,
    liquidity: bigint,
    amtAMin: bigint, amtBMin: bigint,
    to: Address, deadlineSec: number
  ) {
    if (!wallet) throw new Error("Wallet not connected");
    const A = toWrapped(tokenA);
    const B = toWrapped(tokenB);

    const base = {
      address: ROUTER,
      abi: abi.UniswapV2Router02,
      functionName: "removeLiquidity",
      args: [A, B, liquidity, amtAMin, amtBMin, to, BigInt(deadlineSec)],
    } as const;

    const overrides = await estimateOverrides(base);
    return wallet.writeContract({ ...base, ...overrides });
  }

  return { addLiquidity, removeLiquidity };
}
