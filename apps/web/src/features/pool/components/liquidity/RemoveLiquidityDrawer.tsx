import { useState, useMemo } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import styles from "../../modal.module.css";
import { clampDecimalsForInput, tidyOnBlur } from "../../../../utils/number";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";
import { useTokenModule } from "../../../../hooks/useTokenModule";

import { getTokenIcon } from "../../../../lib/getTokenIcon";
import { useLpPosition } from "../../hooks/useLpPosition";
import { fmtUnits, formatAmountStr } from "../../utils";

export function RemoveLiquidityDrawer({
  tokenA,
  tokenB,
  metaA,
  metaB,
  onPendingChange,
}: {
  tokenA?: Address;
  tokenB?: Address;
  metaA?: { address: Address; symbol: string; name?: string; decimals: number; isNative?: boolean };
  metaB?: { address: Address; symbol: string; name?: string; decimals: number; isNative?: boolean };
  onPendingChange?: (p: boolean) => void;
}) {
  const DECIMALS = 6;
  const lpDecimals = 18;   
  const { address: to } = useAccount();

  const [lpAmount, setLpAmount] = useState("");
  const [lpRawOverride, setLpRawOverride] = useState<bigint | null>(null);
  const { toWrapped } = useTokenModule();
  

  // Position LP réelle
  const {
    loading,
    lpBalance,
    totalSupply,
    token0,
    token1,
    reserve0,
    reserve1,
  } = useLpPosition(tokenA, tokenB);

  // Normalise les réserves selon l’ordre visuel A/B (wrap pour comparer)
  const { reserveA, reserveB } = useMemo(() => {
    if (!tokenA || !tokenB || !token0 || !token1) return { reserveA: 0n, reserveB: 0n };
    const readA = toWrapped(tokenA);
    const readB = toWrapped(tokenB);
    if (!reserve0 || !reserve1) return { reserveA: 0n, reserveB: 0n };
    if (token0.toLowerCase() === readA.toLowerCase()) {
      return { reserveA: reserve0, reserveB: reserve1 };
    }
    if (token1.toLowerCase() === readA.toLowerCase()) {
      return { reserveA: reserve1, reserveB: reserve0 };
    }
    return { reserveA: 0n, reserveB: 0n };
  }, [token0, token1, reserve0, reserve1, tokenA, tokenB]);

  // valeur raw utilisée partout
  const lpAmountRaw = useMemo(() => {
    if (lpRawOverride != null) return lpRawOverride;
    const s = tidyOnBlur(lpAmount, DECIMALS) || "0";
    try { return parseUnits(s, lpDecimals); } catch { return 0n; }
  }, [lpAmount, lpRawOverride]);

  // Previews pro-rata
  const previewA = useMemo(() => {
    if (!totalSupply || totalSupply === 0n) return "0";
    const raw = (reserveA * lpAmountRaw) / totalSupply;
    return formatUnits(raw, metaA?.decimals ?? 18);
  }, [reserveA, totalSupply, lpAmountRaw, metaA?.decimals]);

  const previewB = useMemo(() => {
    if (!totalSupply || totalSupply === 0n) return "0";
    const raw = (reserveB * lpAmountRaw) / totalSupply;
    return formatUnits(raw, metaB?.decimals ?? 18);
  }, [reserveB, totalSupply, lpAmountRaw, metaB?.decimals]);

  // Input change
  function onInputChange(val: string) {
    setLpRawOverride(null);
    setLpAmount(clampDecimalsForInput(val, DECIMALS));
  }

  // % helpers
  const setPercentage = (percent: number) => {
    if (!lpBalance) return;
    const raw = (lpBalance * BigInt(Math.floor(percent * 10000))) / 10000n;
    setLpRawOverride(raw);
    const s = formatUnits(raw, lpDecimals);
    setLpAmount(clampDecimalsForInput(s, DECIMALS));
  };

  const setMax = () => {
    if (!lpBalance) return;
    setLpRawOverride(lpBalance);
    const s = formatUnits(lpBalance, lpDecimals);
    setLpAmount(clampDecimalsForInput(s, DECIMALS));
  };

  const { removeLiquidity } = useLiquidityActions();

  async function handleRemoveLiquidity() {
    if (!tokenA || !tokenB || !to) return;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const amtAMin = 0n; 
    const amtBMin = 0n;

    onPendingChange?.(true);
    try {
      await removeLiquidity(
        tokenA,
        tokenB,
        lpAmountRaw,
        amtAMin,
        amtBMin,
        to,
        deadline
      );
    } finally {
      onPendingChange?.(false);
    }
  }

  

  return (
    
    <div className={styles.bodyAddModal}>
      <div className={styles.inputRemoveContainer}>
        <div className={styles.tokenPairLogo}>
          <div className={styles.tokenIconContainer}>
            
            {tokenA && <img src={getTokenIcon(tokenA)} alt={metaA?.symbol ?? "A"} className={styles.tokenIcon} />}
            {tokenB && <img src={getTokenIcon(tokenB)} alt={metaB?.symbol ?? "B"} className={styles.tokenIcon} />}
          </div>
          <div className={styles.tokenNameContainer}>
            <span>{metaA?.symbol ?? "—"}</span>/<span>{metaB?.symbol ?? "—"}</span>
          </div>

          <div className={styles.balanceLpData}>
            {loading ? (
              <div className={styles.skeleton}></div>
            ) : lpBalance && lpBalance > 0n ? (
              <div>Balance LP: {fmtUnits(lpBalance, lpDecimals, DECIMALS)}</div>
            ) : (
              <div>No LP tokens for this pool.</div>
            )}
          </div>
        </div>

        <div className={styles.inputContainerLp}>
          <div className={styles.btnContainerLp}>
            <button onClick={() => setPercentage(0.25)}>25%</button>
            <button onClick={() => setPercentage(0.5)}>50%</button>
            <button onClick={() => setPercentage(0.75)}>75%</button>
            <button onClick={setMax}>Max</button>
          </div>
          <input
            inputMode="decimal"
            placeholder={"0." + "0".repeat(DECIMALS)}
            value={lpAmount}
            onChange={(e) => onInputChange(e.target.value)}
            onBlur={() => setLpAmount(tidyOnBlur(lpAmount, DECIMALS))}
            className={styles.inputRemoveLp}
          />
        </div>
      </div>

      <div className={styles.wormholeContainerRemove}>
        <div className={styles.dataRemoveTokenA}>
          {tokenA && <img src={getTokenIcon(tokenA)} alt={metaA?.symbol ?? "A"} className={styles.tokenIconSmall} />}
          + {formatAmountStr(previewA || "0", DECIMALS)}
        </div>

        <div className={styles.dataRemoveTokenB}>
          {tokenB && <img src={getTokenIcon(tokenB)} alt={metaB?.symbol ?? "B"} className={styles.tokenIconSmall} />}
          + {formatAmountStr(previewB || "0", DECIMALS)}
        </div>

        <button onClick={handleRemoveLiquidity} className={styles.btnRemoveLiquidity}>Remove</button>
      </div>
    </div>
  );
}
