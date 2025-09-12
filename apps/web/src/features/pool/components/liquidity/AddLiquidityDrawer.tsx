// AddLiquidityDrawer.tsx
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";
import { getTokenByAddress, toWrapped  } from "../../../../lib/tokens";
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

export function AddLiquidityDrawer({ tokenA, tokenB, onClose }: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
}) {
  const { address: to } = useAccount();
  const pc = usePublicClient();
  const { addLiquidity } = useLiquidityActions();

  const [tokenIn, setTokenIn] = useState<Address | undefined>(tokenA);
  const [tokenOut, setTokenOut] = useState<Address | undefined>(tokenB);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [pairData, setPairData] = useState<PairData | null>(null);

const readA = tokenIn ? toWrapped(tokenIn) : undefined;  // tTRUST → WTTRUST
const readB = tokenOut ? toWrapped(tokenOut) : undefined;

  const tA = readA ? getTokenByAddress(readA) : null;
  const tB = readB ? getTokenByAddress(readB) : null;
  const decA = tA?.decimals ?? 18;
  const decB = tB?.decimals ?? 18;

  function asBigInt(v: any): bigint | undefined {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(v);
    if (typeof v === "string" && v.trim() !== "") return BigInt(v);
    return undefined;
  }

  // 1) Charger la pair si A/B définis
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

      console.log("[ADD-LIQ] factory.getPair →", pair);

      if (!pair || isZeroAddress(pair)) return;

      const [t0, t1] = await Promise.all([
        pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "token0" }) as Promise<Address>,
        pc.readContract({ address: pair, abi: abi.UniswapV2Pair, functionName: "token1" }) as Promise<Address>,
      ]);

      // getReserves — différents shape possibles selon l’ABI
    const raw = await pc.readContract({
      address: pair,
      abi: abi.UniswapV2Pair,
      functionName: "getReserves",
    }) as any;

    // extractions sans utiliser && (qui introduit false)
    const reserve0 =
      asBigInt(raw?._reserve0) ??
      asBigInt(raw?.reserve0) ??
      (Array.isArray(raw) ? asBigInt(raw[0]) : undefined) ??
      0n;

    const reserve1 =
      asBigInt(raw?._reserve1) ??
      asBigInt(raw?.reserve1) ??
      (Array.isArray(raw) ? asBigInt(raw[1]) : undefined) ??
      0n;

    console.log("[ADD-LIQ] reserves loaded:", reserve0, reserve1);

    setPairData({
      pair,
      token0: t0,
      token1: t1,
      reserve0,
      reserve1,
    });
    } catch (e) {
      console.warn("[ADD-LIQ] load pair error:", e);
      if (!cancelled) setPairData(null);
    }
  })();
  return () => { cancelled = true; };
}, [pc, readA, readB]);

  // 2) Normaliser selon l’ordre visuel A/B **en comparant aux adresses de lecture (wrap)**
  const reserves = useMemo(() => {
    if (!pairData || !readA) return null;
    if (pairData.token0.toLowerCase() === readA.toLowerCase()) {
      return { reserveA: pairData.reserve0, reserveB: pairData.reserve1 };
    } else if (pairData.token1.toLowerCase() === readA.toLowerCase()) {
      return { reserveA: pairData.reserve1, reserveB: pairData.reserve0 };
    }
    return null;
  }, [pairData, readA]);

  // (debug facultatif)
  useEffect(() => {
    console.log("RESERVES typeof:", typeof reserves?.reserveA, typeof reserves?.reserveB, "values:", reserves);
  }, [reserves]);

  // 3) Sync inputs
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
    await addLiquidity(
      tokenIn,
      tokenOut,
      parseUnits(amountIn || "0", decA),
      parseUnits(amountOut || "0", decB),
      0n, 0n,
      to,
      Math.floor(Date.now() / 1000) + 60 * 15
    );
    onClose();
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

      {tB && (
        <img
          src={getTokenIcon(tB.address)}
          alt={tB.symbol}
          className={styles.tokenImgWorLeft}
        />
      )}
      {tA && (
        <img
          src={getTokenIcon(tA.address)}
          alt={tA.symbol}
          className={styles.tokenImgWorRight}
        />
      )}

      <div className={styles.wormholeContainer}>
        <button onClick={onSubmit} className={styles.btnAddLiquidity}>Add Liquidity</button>
      </div>
    </div>
  );
}
