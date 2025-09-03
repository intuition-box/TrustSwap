import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { getDefaultPair, getTokenByAddress } from "../../../lib/tokens";
import { useQuote } from "../hooks/useQuote";
import { useAllowance } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useSwap } from "../hooks/useSwap";
import { abi, addresses } from "@trustswap/sdk";

import TokenField from "./TokenField";
import FlipButton from "./FlipButton";
import SlippagePopover from "./SlippagePopover";
import Summary from "./Summary";
import ApproveAndSwap from "./ApproveAndSwap";

export default function SwapForm() {
  const { address } = useAccount();
  const pc = usePublicClient();

  const defaults = useMemo(() => getDefaultPair(), []);
  const [tokenIn, setTokenIn] = useState<Address>(defaults.tokenIn.address);
  const [tokenOut, setTokenOut] = useState<Address>(defaults.tokenOut.address);
  const [amountIn, setAmountIn] = useState<string>("1");
  const [amountOut, setAmountOut] = useState<string>("");
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.50%

  const quote = useQuote();
  const allowance = useAllowance();
  const approve = useApprove();
  const doSwap = useSwap();

  // Quote auto
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!amountIn || Number(amountIn) <= 0) { setAmountOut(""); return; }
        const q = await quote(tokenIn, tokenOut, amountIn);
        if (alive) setAmountOut(q);
      } catch {
        if (alive) setAmountOut("");
      }
    })();
    return () => { alive = false; };
  }, [tokenIn, tokenOut, amountIn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onApproveAndSwap() {
    if (!address) return;

    const tIn = getTokenByAddress(tokenIn);
    // amountIn en base unités
    const { parseUnits } = await import("viem");
    const amtIn = parseUnits(amountIn || "0", tIn.decimals);

    // 1) Allowance
    const curr = await allowance(address, tokenIn, addresses.UniswapV2Router02 as Address);
    if (curr < amtIn) {
      await approve(tokenIn, addresses.UniswapV2Router02 as Address, amtIn);
    }

    // 2) Re-quote onchain pour minOut
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
    <div >
      <div >
        <h2 >Swap</h2>
        <SlippagePopover valueBps={slippageBps} onChangeBps={setSlippageBps} />
      </div>

      <TokenField
        label="From"
        token={tokenIn}
        onTokenChange={(a) => { setTokenIn(a); }}
        amount={amountIn}
        onAmountChange={setAmountIn}
        readOnly={false}
      />

      <FlipButton onClick={() => {
        setTokenIn(tokenOut);
        setTokenOut(tokenIn);
        setAmountOut(""); // re-quote après flip
      }} />

      <TokenField
        label="To"
        token={tokenOut}
        onTokenChange={(a) => { setTokenOut(a); }}
        amount={amountOut}
        readOnly
      />

      <Summary tokenIn={tokenIn} tokenOut={tokenOut} amountIn={amountIn} amountOut={amountOut} />

      <ApproveAndSwap
        connected={Boolean(address)}
        disabled={!amountIn || Number(amountIn) <= 0}
        onClick={onApproveAndSwap}
      />
    </div>
  );
}
