import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { getDefaultPair, getTokenByAddress } from "../../../lib/tokens";
import { useQuote } from "../hooks/useQuote";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useSwap } from "../hooks/useSwap";
import { usePairData } from "../hooks/usePairData";
import { computePriceImpactPct } from "../hooks/usePriceImpact";
import { useGasEstimate } from "../hooks/useGasEstimate";
import { abi, addresses } from "@trustswap/sdk";

import TokenField from "./TokenField";
import FlipButton from "./FlipButton";
import Summary from "./Summary";
import ApproveAndSwap from "./ApproveAndSwap";
import DetailsDisclosure from "./DetailsDisclosure";
import { parseUnits, formatUnits } from "viem";

import styles from "@ui/styles/Swap.module.css";

export default function SwapForm() {
  const { address } = useAccount();
  const pc = usePublicClient();

  const defaults = useMemo(() => getDefaultPair(), []);
  const [tokenIn, setTokenIn]   = useState<Address>(defaults.tokenIn.address);
  const [tokenOut, setTokenOut] = useState<Address>(defaults.tokenOut.address);
  const [amountIn, setAmountIn] = useState<string>("1");
  const [amountOut, setAmountOut] = useState<string>("");

  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.50%
  const [networkFeeText, setNetworkFeeText] = useState<string | null>(null);

  const quote = useQuote();
  const allowance = useAllowance();
  const approve = useApprove();
  const doSwap = useSwap();
  const fetchPair = usePairData();
  const estimateNetworkFee = useGasEstimate();

  const [pairData, setPairData] = useState<Awaited<ReturnType<typeof fetchPair>>>(null);

  // Quote auto
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!amountIn || Number(amountIn) <= 0) { setAmountOut(""); return; }
        const q = await quote(tokenIn, tokenOut, amountIn);
        if (alive) setAmountOut(q);
      } catch { if (alive) setAmountOut(""); }
    })();
    return () => { alive = false; };
  }, [tokenIn, tokenOut, amountIn]); // eslint-disable-line

  // Pair data (token0/token1/reserves)
  useEffect(() => {
    let alive = true;
    (async () => {
      const pd = await fetchPair(tokenIn, tokenOut);
      if (alive) setPairData(pd);
    })();
    return () => { alive = false; };
  }, [tokenIn, tokenOut]); // eslint-disable-line

  // Estimation network fee (change avec montant, slippage, tokens)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!address || !amountIn || Number(amountIn) <= 0) { setNetworkFeeText(null); return; }
        // pré-calc amtIn et minOut via getAmountsOut (même que pour le swap)
        const tIn = getTokenByAddress(tokenIn);
        const amtIn = parseUnits(amountIn || "0", tIn.decimals);
        const amounts = await pc.readContract({
          address: addresses.UniswapV2Router02 as Address,
          abi: abi.UniswapV2Router02,
          functionName: "getAmountsOut",
          args: [amtIn, [tokenIn, tokenOut]],
        }) as bigint[];
        const out = amounts[amounts.length - 1] ?? 0n;
        const minOut = out - (out * BigInt(slippageBps) / 10_000n);
        const deadline = BigInt(Math.floor(Date.now()/1000) + 60 * 20);

        const fee = await estimateNetworkFee({
          account: address,
          amountIn: amtIn,
          minOut,
          path: [tokenIn, tokenOut],
          to: address,
          deadline,
          nativeSymbol: "tTRUST", // adapte si tu exposes ça via SDK plus tard
        });

        if (alive) setNetworkFeeText(fee);
      } catch {
        if (alive) setNetworkFeeText(null);
      }
    })();
    return () => { alive = false; };
  }, [address, tokenIn, tokenOut, amountIn, slippageBps]); // eslint-disable-line

  // Détails
  const ti = getTokenByAddress(tokenIn);
  const to = getTokenByAddress(tokenOut);
  const priceText =
    Number(amountIn) > 0 && Number(amountOut) > 0
      ? `1 ${ti.symbol} ≈ ${(Number(amountOut) / Number(amountIn)).toFixed(6)} ${to.symbol}`
      : undefined;

  const priceImpact = computePriceImpactPct(tokenIn, tokenOut, amountIn, amountOut, pairData);

  async function onApproveAndSwap() {
    if (!address) return;

    const amtIn = parseUnits(amountIn || "0", ti.decimals);

    // 1) Allowance
    const curr = await allowance(address, tokenIn, addresses.UniswapV2Router02 as Address);
    if (curr < amtIn) {
      await approve(tokenIn, addresses.UniswapV2Router02 as Address, amtIn);
    }

    // 2) MinOut
    const amounts = await pc.readContract({
      address: addresses.UniswapV2Router02 as Address,
      abi: abi.UniswapV2Router02,
      functionName: "getAmountsOut",
      args: [amtIn, [tokenIn, tokenOut]],
    }) as bigint[];

    const out = amounts[amounts.length - 1] ?? 0n;
    const minOut = out - (out * BigInt(slippageBps) / 10_000n);
    const deadline = Math.floor(Date.now()/1000) + 60 * 20;

    // 3) Swap
    await doSwap(address, tokenIn, tokenOut, amountIn, minOut, deadline);
  }

  return (
    <div>
      <div className={styles.inputSwapContainer}>
        <TokenField
          label="From"
          token={tokenIn}
          onTokenChange={(a) => { setTokenIn(a); }}
          amount={amountIn}
          onAmountChange={setAmountIn}
          readOnly={false}
        />

        <DetailsDisclosure
          slippageBps={slippageBps}
          onChangeSlippage={setSlippageBps}
          priceText={priceText}
          priceImpactPct={priceImpact}
          networkFeeText={networkFeeText}
        />
      </div>
      <FlipButton onClick={() => {
        setTokenIn(tokenOut);
        setTokenOut(tokenIn);
        setAmountOut(""); // re-quote après flip
      }} />
      <div className={styles.inputSwapContainer}>
        <TokenField
          label="To"
          token={tokenOut}
          onTokenChange={(a) => { setTokenOut(a); }}
          amount={amountOut}
          readOnly
        />
      </div>

      <Summary tokenIn={tokenIn} tokenOut={tokenOut} amountIn={amountIn} amountOut={amountOut} />

      <ApproveAndSwap
        connected={Boolean(address)}
        disabled={!amountIn || Number(amountIn) <= 0}
        onClick={onApproveAndSwap}
      />
    </div>
  );
}
