// apps/web/src/features/pools/hooks/useLiquidityActions.ts
import { useWalletClient } from "wagmi";
import type { Address } from "viem";
import { abi, addresses } from "@trustswap/sdk";


export function useLiquidityActions() {
const { data: wallet } = useWalletClient();


async function addLiquidity(
tokenA: Address, tokenB: Address,
amtADesired: bigint, amtBDesired: bigint,
amtAMin: bigint, amtBMin: bigint,
to: Address, deadlineSec: number
) {
if (!wallet) throw new Error("Wallet not connected");
return wallet.writeContract({
address: addresses.UniswapV2Router02 as Address,
abi: abi.UniswapV2Router02,
functionName: "addLiquidity",
args: [tokenA, tokenB, amtADesired, amtBDesired, amtAMin, amtBMin, to, BigInt(deadlineSec)],
});
}


async function removeLiquidity(
tokenA: Address, tokenB: Address,
liquidity: bigint,
amtAMin: bigint, amtBMin: bigint,
to: Address, deadlineSec: number
) {
if (!wallet) throw new Error("Wallet not connected");
return wallet.writeContract({
address: addresses.UniswapV2Router02 as Address,
abi: abi.UniswapV2Router02,
functionName: "removeLiquidity",
args: [tokenA, tokenB, liquidity, amtAMin, amtBMin, to, BigInt(deadlineSec)],
});
}


return { addLiquidity, removeLiquidity };
}