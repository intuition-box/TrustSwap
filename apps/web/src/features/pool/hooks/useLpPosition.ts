// features/pools/hooks/useLpPosition.ts
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { abi, addresses } from "@trustswap/sdk";
import { getTokenByAddress, NATIVE_PLACEHOLDER, WNATIVE_ADDRESS } from "../../../lib/tokens";

const ZERO = "0x0000000000000000000000000000000000000000";

function toERC20ForRead(addr?: Address): Address | undefined {
  if (!addr) return undefined;
  return addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase()
    ? (WNATIVE_ADDRESS as Address)
    : addr;
}

function toPct(n: bigint, d: bigint): number {
  if (d === 0n) return 0;
  // nombre flottant OK pour affichage (pas pour on-chain)
  return Number(n) / Number(d) * 100;
}

export type LpPosition = {
  loading: boolean;
  pair?: Address;
  token0?: Address;
  token1?: Address;
  reserve0?: bigint;
  reserve1?: bigint;
  totalSupply?: bigint;
  lpBalance?: bigint;
  sharePct?: number;          // % du pool
  pooledA?: string | null;    // quantité A "appartenant" à l'utilisateur
  pooledB?: string | null;    // quantité B "appartenant" à l'utilisateur
};

export function useLpPosition(tokenA?: Address, tokenB?: Address): LpPosition {
  const pc = usePublicClient({ chainId: 13579 });
  const { address: owner } = useAccount();

  const readA = toERC20ForRead(tokenA);
  const readB = toERC20ForRead(tokenB);

  const [state, setState] = useState<LpPosition>({ loading: false });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState(s => ({ ...s, loading: true }));
      try {
        if (!pc || !readA || !readB || !owner) {
          setState({ loading: false });
          return;
        }

        const pair = await pc.readContract({
          address: addresses.UniswapV2Factory as Address,
          abi: abi.UniswapV2Factory,
          functionName: "getPair",
          args: [readA, readB],
        }) as Address;

        if (!pair || pair === ZERO) {
          setState({ loading: false });
          return;
        }

        const [t0, t1] = await Promise.all([
          pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "token0" }) as Promise<Address>,
          pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "token1" }) as Promise<Address>,
        ]);

        const rawRes = await pc.readContract({
          address: pair,
          abi: abi.UniswapV2Pair,
          functionName: "getReserves",
        }) as any;

        const reserve0: bigint =
          (typeof rawRes?._reserve0 === "bigint" && rawRes._reserve0) ||
          (typeof rawRes?.reserve0 === "bigint" && rawRes.reserve0) ||
          (Array.isArray(rawRes) && typeof rawRes[0] === "bigint" ? rawRes[0] : 0n);

        const reserve1: bigint =
          (typeof rawRes?._reserve1 === "bigint" && rawRes._reserve1) ||
          (typeof rawRes?.reserve1 === "bigint" && rawRes.reserve1) ||
          (Array.isArray(rawRes) && typeof rawRes[1] === "bigint" ? rawRes[1] : 0n);

        const [totalSupply, lpBalance] = await Promise.all([
          pc.readContract({ address: pair, abi: erc20Abi, functionName: "totalSupply" }) as Promise<bigint>,
          pc.readContract({ address: pair, abi: erc20Abi, functionName: "balanceOf", args: [owner] }) as Promise<bigint>,
        ]);

        // part de pool
        const sharePct = toPct(lpBalance, totalSupply);

        // normaliser A/B selon l'ordre visuel (tokenA/tokenB → readA/readB)
        let reserveA = reserve0;
        let reserveB = reserve1;
        if (t0.toLowerCase() !== readA.toLowerCase()) {
          reserveA = reserve1;
          reserveB = reserve0;
        }

        // format "pooled" (montants sous-jacents de l'utilisateur)
        const tA = getTokenByAddress(readA as string);
        const tB = getTokenByAddress(readB as string);
        const pooledA =
          totalSupply === 0n ? "0" :
          formatUnits((reserveA * lpBalance) / totalSupply, tA.decimals);
        const pooledB =
          totalSupply === 0n ? "0" :
          formatUnits((reserveB * lpBalance) / totalSupply, tB.decimals);

        if (!cancelled) {
          setState({
            loading: false,
            pair,
            token0: t0,
            token1: t1,
            reserve0,
            reserve1,
            totalSupply,
            lpBalance,
            sharePct,
            pooledA,
            pooledB,
          });
        }
      } catch (e) {
        if (!cancelled) setState({ loading: false });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [pc, readA, readB, owner]);

  return state;
}
