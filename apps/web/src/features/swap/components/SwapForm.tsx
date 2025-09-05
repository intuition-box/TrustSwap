// SwapForm.tsx
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { getDefaultPair, getTokenByAddress, NATIVE_PLACEHOLDER } from "../../../lib/tokens";
import { useQuoteDetails } from "../hooks/useQuoteDetails";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useSwap } from "../hooks/useSwap";
import { usePairData } from "../hooks/usePairData";
import { computePriceImpactPct } from "../hooks/usePriceImpact";
import { useGasEstimate } from "../hooks/useGasEstimate";
import { parseUnits } from "viem";
import styles from "@ui/styles/Swap.module.css";
import TokenField from "./TokenField";
import FlipButton from "./FlipButton";
import ApproveAndSwap from "./ApproveAndSwap";
import DetailsDisclosure from "./DetailsDisclosure";
import { addresses } from "@trustswap/sdk";

// helpers
const isNative = (a?: Address) => !!a && a.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

export default function SwapForm() {
  const { address } = useAccount();

  const defaults = useMemo(() => getDefaultPair(), []);
  const [tokenIn, setTokenIn]   = useState<Address>(defaults.tokenIn.address);
  const [tokenOut, setTokenOut] = useState<Address>(defaults.tokenOut.address);
  const [amountIn, setAmountIn] = useState<string>("");
  const [amountOut, setAmountOut] = useState<string>("");

  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.50%
  const [networkFeeText, setNetworkFeeText] = useState<string | null>(null);

  const quoteDetails = useQuoteDetails(); 
  const allowance = useAllowance();
  const approve = useApprove();
  const doSwap = useSwap();
  const fetchPair = usePairData();
  const estimateNetworkFee = useGasEstimate();

  const [pairData, setPairData] = useState<Awaited<ReturnType<typeof fetchPair>>>(null);

  // NEW: on garde en state le "best path" et le outBn pour réutiliser partout
  const [bestPath, setBestPath] = useState<Address[] | null>(null);
  const [lastOutBn, setLastOutBn] = useState<bigint | null>(null);

  // Quote auto (debounce + null)
  useEffect(() => {
    if (!amountIn || Number(amountIn) <= 0) { setAmountOut(""); setBestPath(null); setLastOutBn(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        // CHANGE: utilise la version "details"
        const qd = await quoteDetails(tokenIn, tokenOut, amountIn);
        if (cancelled) return;
        if (!qd) {
          setAmountOut("");
          setBestPath(null);
          setLastOutBn(null);
        } else {
          setAmountOut(qd.amountOutFormatted);
          setBestPath(qd.path);
          setLastOutBn(qd.amountOutBn);
        }
      } catch {
        if (!cancelled) { setAmountOut(""); setBestPath(null); setLastOutBn(null); }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [tokenIn, tokenOut, amountIn, quoteDetails]);

  // Pair data (token0/token1/reserves) — OK si ton hook wrap le natif en interne
  useEffect(() => {
  let alive = true;
  (async () => {
    const pd = await fetchPair(tokenIn, tokenOut);
    if (alive) {
      setPairData(pd);
      if (!pd) console.warn("[pairData] no LP for", tokenIn, tokenOut);
    }
  })();
  return () => { alive = false; };
}, [tokenIn, tokenOut]);

  // Estimation network fee — CHANGE: réutilise bestPath + outBn
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!address) { setNetworkFeeText(null); return; }
        const v = Number(String(amountIn).replace(",", "."));
        if (!isFinite(v) || v <= 0) { setNetworkFeeText(null); return; }
        if (!bestPath || !lastOutBn) { setNetworkFeeText(null); return; }

        const out = lastOutBn;
        const minOut = out - (out * BigInt(slippageBps) / 10_000n);
        const deadline = BigInt(Math.floor(Date.now()/1000) + 60 * 20);

        const ti = getTokenByAddress(tokenIn);
        const amtIn = parseUnits(String(v), ti.decimals);

        const feeText = await estimateNetworkFee({
          account: address,
          amountIn: amtIn,
          minOut,
          path: bestPath,         // CHANGE
          to: address,
          deadline,
          nativeSymbol: "tTRUST",
        });

        if (alive) setNetworkFeeText(feeText);
      } catch {
        if (alive) setNetworkFeeText(null);
      }
    })();
    return () => { alive = false; };
  }, [address, tokenIn, tokenOut, amountIn, slippageBps, bestPath, lastOutBn, estimateNetworkFee]);

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

    const v = Number(String(amountIn).replace(",", "."));
    if (!isFinite(v) || v <= 0) return;

    // On s'assure d'avoir la quote/path à jour
    const qd = await quoteDetails(tokenIn, tokenOut, String(v));
    if (!qd) throw new Error("No route/liquidity for this pair");

    const amtIn = parseUnits(String(v), ti.decimals);
    const out = qd.amountOutBn;
    const minOut = out - (out * BigInt(slippageBps) / 10_000n);
    const deadline = Math.floor(Date.now()/1000) + 60 * 20;
    if (!address) { setNetworkFeeText(null); /* console.log("no account"); */ return; }
    if (!isFinite(v) || v <= 0) { setNetworkFeeText(null); /* console.log("no amount"); */ return; }
    if (!bestPath || !lastOutBn) { setNetworkFeeText(null); /* console.log("no route/quote yet"); */ return; }

    // Approve seulement si tokenIn est ERC-20
    if (!isNative(tokenIn) && address) {
      const curr = await allowance(address, tokenIn, addresses.UniswapV2Router02 as Address);
      if (curr < amtIn) {
        await approve(tokenIn, addresses.UniswapV2Router02 as Address, amtIn);
      }
    }

    // Swap — ton hook `useSwap` gère natif/erc20 + mapping interne
    if (!address) throw new Error("No connected account");
    await doSwap(address, tokenIn, tokenOut, String(v), minOut, deadline);
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

        {amountIn && Number(amountIn) > 0 && (
          <>
            <DetailsDisclosure
              slippageBps={slippageBps}
              onChangeSlippage={setSlippageBps}
              priceText={priceText}
              priceImpactPct={priceImpact}
              networkFeeText={networkFeeText}
            />
          </>
        )}

        <FlipButton
          onClick={() => {
            setTokenIn(tokenOut);
            setTokenOut(tokenIn);
            setAmountOut(""); 
            setBestPath(null);
            setLastOutBn(null);
          }} 
        />
      </div>
      <div className={styles.inputSwapContainerTo}>
        <TokenField
          label="To"
          token={tokenOut}
          onTokenChange={(a) => { setTokenOut(a); }}
          amount={amountOut}
          readOnly
        />
      </div>

      {amountIn && Number(amountIn) > 0 && (
        <>
          <ApproveAndSwap
            connected={Boolean(address)}
            disabled={!amountIn || Number(amountIn) <= 0}
            onClick={onApproveAndSwap}
          />
        </>
      )}
    </div>
  );
}
