import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";
import { toWrapped } from "../../../../lib/tokens";
import { getTokenIcon } from "../../../../lib/getTokenIcon";
import styles from "../../modal.module.css";
import TokenField from "../../../swap/components/TokenField";
import { quoteOutFromReserves } from "../../../../utils/quotes";
import { abi, addresses } from "@trustswap/sdk";
import { isZeroAddress } from "../../../../lib/erc20Read";

type PairData = {
  pair: Address;
  token0: Address;
  token1: Address;
  reserve0: bigint;
  reserve1: bigint;
};

export function AddLiquidityDrawer({
  tokenA,
  tokenB,
  metaA,
  metaB,
  onPendingChange,
}: {
  tokenA?: Address;
  tokenB?: Address;
  metaA?: { address: Address; symbol: string; decimals: number; isNative?: boolean };
  metaB?: { address: Address; symbol: string; decimals: number; isNative?: boolean };
  onPendingChange?: (p: boolean) => void;
}) {
  const { address: to } = useAccount();
  const pc = usePublicClient();
  const { addLiquidity } = useLiquidityActions();

  const [tokenIn, setTokenIn] = useState<Address | undefined>(tokenA);
  const [tokenOut, setTokenOut] = useState<Address | undefined>(tokenB);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [pairData, setPairData] = useState<PairData | null>(null);

  const readA = tokenIn ? toWrapped(tokenIn) : undefined;
  const readB = tokenOut ? toWrapped(tokenOut) : undefined;

  // décimales (fallback 18 si meta absente)
  const decA = metaA?.decimals ?? 18;
  const decB = metaB?.decimals ?? 18;

  function asBigInt(v: any): bigint | undefined {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(v);
    if (typeof v === "string" && v.trim() !== "") return BigInt(v);
    return undefined;
  }

  // charge la paire (token0/1, reserves) dès que readA/readB changent
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPairData(null);
      if (!pc || !readA || !readB) return;
      try {
        const pair = await pc.readContract({
          address: addresses.UniswapV2Factory as Address,
          abi: abi.UniswapV2Factory,
          functionName: "getPair",
          args: [readA, readB],
        }) as Address;

        if (!pair || isZeroAddress(pair)) return;

        const [t0, t1] = await Promise.all([
          pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "token0" }) as Promise<Address>,
          pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "token1" }) as Promise<Address>,
        ]);

        const raw = await pc.readContract({
          address: pair,
          abi: abi.UniswapV2Pair,
          functionName: "getReserves",
        }) as any;

        const reserve0 =
          asBigInt(raw?._reserve0) ?? asBigInt(raw?.reserve0) ?? (Array.isArray(raw) ? asBigInt(raw[0]) : undefined) ?? 0n;
        const reserve1 =
          asBigInt(raw?._reserve1) ?? asBigInt(raw?.reserve1) ?? (Array.isArray(raw) ? asBigInt(raw[1]) : undefined) ?? 0n;

        if (!cancelled) setPairData({ pair, token0: t0, token1: t1, reserve0, reserve1 });
      } catch (e) {
        if (!cancelled) setPairData(null);
      }
    })();
    return () => { cancelled = true; };
  }, [pc, readA, readB]);

  const reserves = useMemo(() => {
    if (!pairData || !readA) return null;
    if (pairData.token0.toLowerCase() === readA.toLowerCase()) {
      return { reserveA: pairData.reserve0, reserveB: pairData.reserve1 };
    } else if (pairData.token1.toLowerCase() === readA.toLowerCase()) {
      return { reserveA: pairData.reserve1, reserveB: pairData.reserve0 };
    }
    return null;
  }, [pairData, readA]);

  function onChangeAmountIn(v: string) {
    setAmountIn(v);
    if (!reserves || reserves.reserveA === 0n || reserves.reserveB === 0n) return;
    const nextB = quoteOutFromReserves(v, decA, decB, reserves.reserveA, reserves.reserveB);
    setAmountOut(nextB ?? "");
  }

  function onChangeAmountOut(v: string) {
    setAmountOut(v);
    if (!reserves || reserves.reserveA === 0n || reserves.reserveB === 0n) return;
    const nextA = quoteOutFromReserves(v, decB, decA, reserves.reserveB, reserves.reserveA);
    setAmountIn(nextA ?? "");
  }

  async function onSubmit() {
    if (!tokenIn || !tokenOut || !to) return;
    onPendingChange?.(true);
    try {
      await addLiquidity(
        tokenIn,                 // UI addr (peut être natif placeholder)
        tokenOut,
        parseUnits(amountIn || "0", decA),
        parseUnits(amountOut || "0", decB),
        0n, 0n,                  // slippage mins (à calculer si besoin)
        to,
        Math.floor(Date.now() / 1000) + 60 * 15
      );
    } finally {
      onPendingChange?.(false);
    }
  }

  return (
    <div className={styles.bodyAddModal}>
      <div className={styles.inputAddLiquidityContainer}>
        <div className={styles.inputAddContainer}>
          <TokenField
            label=""
            token={tokenIn}
            onTokenChange={(addr) => { setTokenIn(addr); setAmountIn(""); setAmountOut(""); }}
            amount={amountIn}
            onAmountChange={onChangeAmountIn}
            readOnly={false}
          />
        </div>
        <div className={styles.inputAddContainer}>
          <TokenField
            label=""
            token={tokenOut}
            onTokenChange={(addr) => { setTokenOut(addr); setAmountIn(""); setAmountOut(""); }}
            amount={amountOut}
            onAmountChange={onChangeAmountOut}
            readOnly={false}
          />
        </div>
      </div>

      {metaB && tokenOut && (
        <img src={getTokenIcon(tokenOut)} alt={metaB.symbol} className={styles.tokenImgWorLeft} />
      )}
      {metaA && tokenIn && (
        <img src={getTokenIcon(tokenIn)} alt={metaA.symbol} className={styles.tokenImgWorRight} />
      )}

      <div className={styles.wormholeContainer}>
        <button onClick={onSubmit} className={styles.btnAddLiquidity}>
          Add Liquidity
        </button>
      </div>
    </div>
  );
}
