// features/pools/hooks/useLpPosition.ts
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { abi, addresses } from "@trustswap/sdk";

import { useTokenModule } from "../../../hooks/useTokenModule";



function toERC20ForRead(addr?: Address): Address | undefined {
  const { NATIVE_PLACEHOLDER, WNATIVE_ADDRESS } = useTokenModule();

  if (!addr) return undefined;
  return addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase()
    ? (WNATIVE_ADDRESS as Address)
    : addr;
}

function toPct(n: bigint, d: bigint): number {
  if (d === 0n) return 0;
  return (Number(n) / Number(d)) * 100;
}

// getReserves renvoie des shapes différents selon l’ABI / client.
// Cette util uniformise en bigint.
function asBigintReserve(raw: any, keyA: string, keyB: string, idx: number): bigint {
  if (typeof raw?.[keyA] === "bigint") return raw[keyA];
  if (typeof raw?.[keyB] === "bigint") return raw[keyB];
  if (Array.isArray(raw) && typeof raw[idx] === "bigint") return raw[idx];
  return 0n;
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
  sharePct?: number;       // % du pool
  pooledA?: string | null; // quantités “appartenant” à l’utilisateur (formatées)
  pooledB?: string | null;
};

export function useLpPosition(tokenA?: Address, tokenB?: Address): LpPosition {
  const pc = usePublicClient(); // ✅ pas de chainId forcé ici
  const { address: owner } = useAccount();

  const { getOrFetchToken } = useTokenModule();


  // adresses “lecture” (toujours ERC-20)
  const readA = toERC20ForRead(tokenA);
  const readB = toERC20ForRead(tokenB);

  const [state, setState] = useState<LpPosition>({ loading: false });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true }));

      try {
        // Guards
        if (!pc || !owner || !readA || !readB) {
          if (!cancelled) setState({ loading: false });
          return;
        }

        // 1) Pair address
        const pair = (await pc.readContract({
          address: addresses.UniswapV2Factory as Address,
          abi: abi.UniswapV2Factory,
          functionName: "getPair",
          args: [readA, readB],
        })) as Address;

        if (!pair || pair.toLowerCase() === zeroAddress) {
          if (!cancelled) setState({ loading: false });
          return;
        }

        // 2) token0/token1 + reserves
        const [t0, t1] = await Promise.all([
          pc.readContract({
            address: pair,
            abi: abi.UniswapV2Pair,
            functionName: "token0",
          }) as Promise<Address>,
          pc.readContract({
            address: pair,
            abi: abi.UniswapV2Pair,
            functionName: "token1",
          }) as Promise<Address>,
        ]);

        const rawRes = (await pc.readContract({
          address: pair,
          abi: abi.UniswapV2Pair,
          functionName: "getReserves",
        })) as any;

        const reserve0 = asBigintReserve(rawRes, "_reserve0", "reserve0", 0);
        const reserve1 = asBigintReserve(rawRes, "_reserve1", "reserve1", 1);

        // 3) supply + user LP
        const [totalSupply, lpBalance] = await Promise.all([
          pc.readContract({
            address: pair,
            abi: erc20Abi,
            functionName: "totalSupply",
          }) as Promise<bigint>,
          pc.readContract({
            address: pair,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [owner],
          }) as Promise<bigint>,
        ]);

        const sharePct = toPct(lpBalance, totalSupply);

        // 4) Normaliser A/B selon l’ordre visuel (tokenA/tokenB)
        let reserveA = reserve0;
        let reserveB = reserve1;
        if (t0.toLowerCase() !== readA.toLowerCase()) {
          reserveA = reserve1;
          reserveB = reserve0;
        }

        // 5) Décimales pour format (safe on-chain).
        //    Ici on prend celles des ERC-20 de la pair (readA/readB).
        //    WTTRUST a 18, et les ERC-20 importés seront lus on-chain via getOrFetchToken.
        const [metaA, metaB] = await Promise.all([
          getOrFetchToken(readA),
          getOrFetchToken(readB),
        ]);
        const decA = Number(metaA.decimals ?? 18);
        const decB = Number(metaB.decimals ?? 18);

        const pooledA =
          totalSupply === 0n
            ? "0"
            : formatUnits((reserveA * lpBalance) / totalSupply, decA);
        const pooledB =
          totalSupply === 0n
            ? "0"
            : formatUnits((reserveB * lpBalance) / totalSupply, decB);

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
    return () => {
      cancelled = true;
    };
  }, [pc, owner, readA, readB]);

  return state;
}
