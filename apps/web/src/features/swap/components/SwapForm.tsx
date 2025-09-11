// SwapForm.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { getAddress, parseUnits, formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import {
  getDefaultPair,
  TOKENLIST,
  NATIVE_PLACEHOLDER,
} from "../../../lib/tokens";
import { useImportedTokens } from "../hooks/useImportedTokens";
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
import { addresses, abi } from "@trustswap/sdk";

const isNative = (a?: Address) =>
  !!a && a.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

const norm = (a?: string) => (a ? a.toLowerCase() : "");


const normalizeAmountStr = (s: string) => String(s).replace(",", ".").trim();
const fmt5 = (n: string | number) => {
  const x = Number(n);
  if (!isFinite(x)) return "";
  return x.toFixed(5).replace(/\.?0+$/, "");
};


function firstSuccess<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let pending = promises.length;
    const errors: any[] = [];
    if (pending === 0) {
      reject(new Error("No promises"));
      return;
    }
    promises.forEach((p, i) =>
      p.then(resolve).catch((e) => {
        errors[i] = e;
        pending -= 1;
        if (pending === 0) reject(errors[0] ?? e);
      })
    );
  });
}

type Meta = {
  address: Address;
  symbol: string;
  decimals: number;
  name?: string;
};

export default function SwapForm() {
  const { address } = useAccount();
  const pc = usePublicClient();

  const defaults = useMemo(() => getDefaultPair(), []);
  const [tokenIn, setTokenIn] = useState<Address>(defaults.tokenIn.address);
  const [tokenOut, setTokenOut] = useState<Address | undefined>(undefined);
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

  const [pairData, setPairData] =
    useState<Awaited<ReturnType<typeof fetchPair>>>(null);

  const [bestPath, setBestPath] = useState<Address[] | null>(null);
  const [lastOutBn, setLastOutBn] = useState<bigint | null>(null);


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
        symbol:
          t.symbol || `${String(t.address).slice(0, 6)}…${String(t.address).slice(-4)}`,
        decimals: Number(t.decimals ?? 18),
        name: t.name,
      });
    }
    return m;
  }, [imported]);

  function getMeta(addr?: Address): Meta {
    if (!addr) {
      return {
        address: "0x0000000000000000000000000000000000000000" as Address,
        symbol: "—",
        decimals: 18,
        name: "No token",
      };
    }
    const hit = tokenMap.get(norm(addr));
    if (hit) return hit;
    return {
      address: addr,
      symbol: `${String(addr).slice(0, 6)}…${String(addr).slice(-4)}`,
      decimals: 18,
    };
  }

  function buildPaths(tin: Address, tout: Address): Address[][] {
    const WT = addresses.WTTRUST as Address;
    const TSWP = addresses.TSWP as Address;

    const A = isNative(tin) ? WT : tin;
    const B = isNative(tout) ? WT : tout;

    
    const paths: Address[][] = [
      [A, B],
      [A, WT, B],
      [A, TSWP, B],
    ];

    const seen = new Set<string>();
    const uniq: Address[][] = [];
    for (const p of paths) {
      const k = p.join(">");
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(p);
      }
    }
    return uniq;
  }

  
  async function fastRouterQuote(
    tin: Address,
    tout: Address,
    amtStr: string
  ): Promise<{ path: Address[]; outBn: bigint; outFmt: string }> {
    if (!pc) throw new Error("no public client");
    const amtIn = parseUnits(normalizeAmountStr(amtStr), getMeta(tin).decimals);
    const paths = buildPaths(tin, tout);

    const calls = paths.map(async (path) => {
      const amounts = (await pc.readContract({
        address: addresses.UniswapV2Router02 as Address,
        abi: abi.UniswapV2Router02,
        functionName: "getAmountsOut",
        args: [amtIn, path],
      })) as bigint[];
      const outBn = amounts[amounts.length - 1];
      const outFmt = formatUnits(outBn, getMeta(tout).decimals);
      return { path, outBn, outFmt };
    });

    return firstSuccess(calls);
  }

  
  const quoteSeq = useRef(0);
  useEffect(() => {
    const amtNorm = normalizeAmountStr(amountIn);
    if (!amtNorm || Number(amtNorm) <= 0) {
      setAmountOut("");
      setBestPath(null);
      setLastOutBn(null);
      return;
    }

    const seq = ++quoteSeq.current;
    const timer = setTimeout(async () => {
      try {
        const pHook = (async () => {
          const qd = await quoteDetails(tokenIn, tokenOut, amtNorm);
          if (!qd) throw new Error("hook-no-route");
          return {
            path: qd.path,
            outBn: qd.amountOutBn,
            outFmt: qd.amountOutFormatted,
          };
        })();

        const pFast = fastRouterQuote(tokenIn, tokenOut, amtNorm);

        const first = await firstSuccess([pHook, pFast]);

        if (quoteSeq.current !== seq) return; 

        setAmountOut(fmt5(first.outFmt));
        setBestPath(first.path);
        setLastOutBn(first.outBn);
      } catch {
        if (quoteSeq.current !== seq) return;
        setAmountOut("");
        setBestPath(null);
        setLastOutBn(null);
      }
    }, 80); // micro-debounce

    return () => clearTimeout(timer);
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
    return () => {
      alive = false;
    };
  }, [tokenIn, tokenOut, fetchPair]);

  // Estimation réseau
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!address) return setNetworkFeeText(null);
        const v = Number(normalizeAmountStr(amountIn));
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
    return () => {
      alive = false;
    };
  }, [
    address,
    tokenIn,
    tokenOut,
    amountIn,
    slippageBps,
    bestPath,
    lastOutBn,
    estimateNetworkFee,
  ]);

  // Détails
  const ti = getMeta(tokenIn);
  const to = tokenOut ? getMeta(tokenOut) : undefined;
  const priceText =
    Number(amountIn) > 0 && Number(amountOut) > 0
      ? `1 ${ti.symbol} ≈ ${(Number(amountOut) / Number(amountIn)).toFixed(
          6
        )} ${to?.symbol}`
      : undefined;

  const priceImpact = computePriceImpactPct(
    tokenIn,
    tokenOut ?? "0x0000000000000000000000000000000000000000",
    amountIn,
    amountOut,
    pairData
  ); 

  async function onApproveAndSwap() {
    if (!address) return;

    const v = Number(normalizeAmountStr(amountIn));
    if (!isFinite(v) || v <= 0) return;

    // Réutilise la dernière quote si disponible, sinon hook
    const outBn =
      lastOutBn ??
      (await (async () => {
        const qd = await quoteDetails(
          tokenIn,
          tokenOut ?? "0x0000000000000000000000000000000000000000",
          String(v)
        );
        if (!qd) throw new Error("No route/liquidity for this pair");
        return qd.amountOutBn;
      })());
    const minOut = outBn - (outBn * BigInt(slippageBps)) / 10_000n;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const ti = getMeta(tokenIn);
    const amtIn = parseUnits(String(v), ti.decimals);

    if (!isNative(tokenIn)) {
      const curr = await allowance(
        address,
        tokenIn,
        addresses.UniswapV2Router02 as Address
      );
      if (curr < amtIn) {
        await approve(
          tokenIn,
          addresses.UniswapV2Router02 as Address,
          amtIn
        );
      }
    }

    await doSwap(
      address,
      tokenIn,
      tokenOut ?? "0x0000000000000000000000000000000000000000",
      String(v),
      minOut,
      deadline
    );
  }

  // setters checksum
  const setTokenInSafe = (a: Address) => {
    try {
      setTokenIn(getAddress(a));
    } catch {
      setTokenIn(a);
    }
  };
  const setTokenOutSafe = (a: Address) => {
    try {
      setTokenOut(getAddress(a));
    } catch {
      setTokenOut(a);
    }
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
            if (!tokenOut) {
              // juste remplir le To avec le From si To est vide
              setTokenOut(tokenIn);
              setAmountOut(amountIn);
              return;
            }
            // flip classique
            const nextIn  = (() => { try { return getAddress(tokenOut); } catch { return tokenOut; } })();
            const nextOut = (() => { try { return getAddress(tokenIn);  } catch { return tokenIn;  } })();
            setTokenIn(nextIn as Address);
            setTokenOut(nextOut as Address);
            setAmountIn(amountOut);
            setAmountOut(amountIn);
            setBestPath(null);
            setLastOutBn(null);
          }}
        />

        <TokenField
          label="To"
          token={tokenOut ?? "0x0000000000000000000000000000000000000000"}
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
