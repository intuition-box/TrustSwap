// SwapForm.tsx
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { getAddress, parseUnits } from "viem"; // ⬅️ getAddress pour checksum
import { useAccount } from "wagmi";
import {
  getDefaultPair,
  // getTokenByAddress,  // ⬅️ NE L'UTILISE PLUS ICI
  TOKENLIST,            // ⬅️ on va merger avec importés
  NATIVE_PLACEHOLDER,
} from "../../../lib/tokens";
import { useImportedTokens } from "../hooks/useImportedTokens"; // ⬅️ IMPORT
import { useQuoteDetails } from "../hooks/useQuoteDetails";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useSwap } from "../hooks/useSwap";
import { usePairData } from "../hooks/usePairData";
import { computePriceImpactPct } from "../hooks/usePriceImpact";
import { useGasEstimate } from "../hooks/useGasEstimate";
import styles from "@ui/styles/Swap.module.css";
import TokenField from "./TokenField";
import FlipButton from "./FlipButton";
import ApproveAndSwap from "./ApproveAndSwap";
import DetailsDisclosure from "./DetailsDisclosure";
import { addresses } from "@trustswap/sdk";

const isNative = (a?: Address) =>
  !!a && a.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

const norm = (a: string) => a.toLowerCase();

type Meta = {
  address: Address;
  symbol: string;
  decimals: number;
  name?: string;
};

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

  // NEW: best path + outBn
  const [bestPath, setBestPath] = useState<Address[] | null>(null);
  const [lastOutBn, setLastOutBn] = useState<bigint | null>(null);

  // ⬇️ NEW: merge TOKENLIST + imported
  const { tokens: imported } = useImportedTokens();

  const tokenMap = useMemo(() => {
    const m = new Map<string, Meta>();
    for (const t of TOKENLIST) {
      if (t.hidden) continue;
      m.set(norm(t.address), {
        address: t.address as Address,
        symbol: t.symbol,
        decimals: Number(t.decimals ?? 18),
        name: t.name,
      });
    }
    for (const t of imported) {
      m.set(norm(t.address), {
        address: t.address,
        symbol: t.symbol || `${String(t.address).slice(0,6)}…${String(t.address).slice(-4)}`,
        decimals: Number(t.decimals ?? 18), // fallback 18 si non fourni
        name: t.name,
      });
    }
    return m;
  }, [imported]);

  function getMeta(addr: Address): Meta {
    const hit = tokenMap.get(norm(addr));
    if (hit) return hit;
    // Dernier filet : ne JETTE PAS → évite le crash
    return {
      address: addr,
      symbol: `${String(addr).slice(0,6)}…${String(addr).slice(-4)}`,
      decimals: 18,
    };
  }

  // Quote auto (debounce)
  useEffect(() => {
    if (!amountIn || Number(amountIn) <= 0) {
      setAmountOut("");
      setBestPath(null);
      setLastOutBn(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const qd = await quoteDetails(tokenIn, tokenOut, amountIn);
        if (cancelled) return;
        if (!qd) {
          setAmountOut("");
          setBestPath(null);
          setLastOutBn(null);
        } else {
          const formatted = Number(qd.amountOutFormatted);
          setAmountOut(isNaN(formatted) ? "" : formatted.toFixed(5).replace(/\.?0+$/, ""));
          setBestPath(qd.path);
          setLastOutBn(qd.amountOutBn);
        }
      } catch {
        if (!cancelled) {
          setAmountOut("");
          setBestPath(null);
          setLastOutBn(null);
        }
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tokenIn, tokenOut, amountIn, quoteDetails]);

  // Pair data
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
  }, [tokenIn, tokenOut, fetchPair]);

  // Estimation network fee (remplace getTokenByAddress → getMeta)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!address) return setNetworkFeeText(null);
        const v = Number(String(amountIn).replace(",", "."));
        if (!isFinite(v) || v <= 0) return setNetworkFeeText(null);
        if (!bestPath || !lastOutBn) return setNetworkFeeText(null);

        const out = lastOutBn;
        const minOut = out - (out * BigInt(slippageBps)) / 10_000n;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

        const ti = getMeta(tokenIn);
        const amtIn = parseUnits(String(v), ti.decimals);

        const feeText = await estimateNetworkFee({
          account: address,
          amountIn: amtIn,
          minOut,
          path: bestPath,
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

  // Détails (remplace getTokenByAddress → getMeta)
  const ti = getMeta(tokenIn);
  const to  = getMeta(tokenOut);
  const priceText =
    Number(amountIn) > 0 && Number(amountOut) > 0
      ? `1 ${ti.symbol} ≈ ${(Number(amountOut) / Number(amountIn)).toFixed(6)} ${to.symbol}`
      : undefined;

  const priceImpact = computePriceImpactPct(tokenIn, tokenOut, amountIn, amountOut, pairData);

  async function onApproveAndSwap() {
    if (!address) return;

    const v = Number(String(amountIn).replace(",", "."));
    if (!isFinite(v) || v <= 0) return;

    const outBn = lastOutBn ?? (await (async () => {
      const qd = await quoteDetails(tokenIn, tokenOut, String(v));
      if (!qd) throw new Error("No route/liquidity for this pair");
      return qd.amountOutBn;
    })());
    const minOut = outBn - (outBn * BigInt(slippageBps)) / 10_000n;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const ti = getMeta(tokenIn);
    const amtIn = parseUnits(String(v), ti.decimals);

    if (!isNative(tokenIn)) {
      const curr = await allowance(address, tokenIn, addresses.UniswapV2Router02 as Address);
      if (curr < amtIn) {
        await approve(tokenIn, addresses.UniswapV2Router02 as Address, amtIn);
      }
    }

    await doSwap(address, tokenIn, tokenOut, String(v), minOut, deadline);
  }

  // setters checksum
  const setTokenInSafe = (a: Address) => {
    try { setTokenIn(getAddress(a)); } catch { setTokenIn(a); }
  };
  const setTokenOutSafe = (a: Address) => {
    try { setTokenOut(getAddress(a)); } catch { setTokenOut(a); }
  };

  return (
    <div className={styles.inputSwapBody}>
      <div className={styles.inputSwapContainer}>
        <TokenField
          label="From"
          token={tokenIn}
          onTokenChange={setTokenInSafe}
          amount={amountIn}
          onAmountChange={setAmountIn}
          readOnly={false}
        />
      </div>

      <div className={styles.inputSwapContainerTo}>
        <FlipButton
          onClick={() => {
            const nextIn  = (() => { try { return getAddress(tokenOut); } catch { return tokenOut; } })();
            const nextOut = (() => { try { return getAddress(tokenIn);  } catch { return tokenIn;  } })();
            setTokenIn(nextIn);
            setTokenOut(nextOut);
            setAmountIn(amountOut);
            setAmountOut(amountIn);
            setBestPath(null);
            setLastOutBn(null);
          }}
        />

        <TokenField
          label="To"
          token={tokenOut}
          onTokenChange={setTokenOutSafe}
          amount={amountOut}
          readOnly
        />
      </div>

      {amountIn && Number(amountIn) > 0 && (
        <>
          <DetailsDisclosure
            slippageBps={slippageBps}
            onChangeSlippage={setSlippageBps}
            priceText={priceText}
            priceImpactPct={priceImpact}
            networkFeeText={networkFeeText}
          />
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
