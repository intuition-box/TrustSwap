import { useState, useMemo } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import styles from "../../modal.module.css";
import { clampDecimalsForInput, tidyOnBlur } from "../../../../utils/number";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";
import { TOKENLIST, toWrapped } from "../../../../lib/tokens";
import { getTokenIcon } from "../../../../lib/getTokenIcon";
import { useLpPosition } from "../../hooks/useLpPosition";
import { fmtUnits, formatAmountStr } from "../../utils";

export function RemoveLiquidityDrawer({
  tokenA,
  tokenB,
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
  onRemoveLiquidity: (amount: string) => Promise<void>;
}) {
  const DECIMALS = 6;      // décimales visibles dans l'input
  const lpDecimals = 18;   // LP UniswapV2 = 18
  const { address: to } = useAccount();
  // valeur affichée (décimale clampée)
  const [lpAmount, setLpAmount] = useState("");
  // override précis en wei (pour % et Max)
  const [lpRawOverride, setLpRawOverride] = useState<bigint | null>(null);

  const tokenInfoA = useMemo(
    () => TOKENLIST.find((t) => t.address.toLowerCase() === tokenA?.toLowerCase()),
    [tokenA]
  );
  const tokenInfoB = useMemo(
    () => TOKENLIST.find((t) => t.address.toLowerCase() === tokenB?.toLowerCase()),
    [tokenB]
  );

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

  // Normalise les réserves selon l’ordre visuel A/B
  const { reserveA, reserveB } = useMemo(() => {
    if (!token0 || !token1) return { reserveA: 0n, reserveB: 0n };
    const readA = tokenA ? toWrapped(tokenA) : undefined;
    const readB = tokenB ? toWrapped(tokenB) : undefined;
    if (!readA || !readB || reserve0 === undefined || reserve1 === undefined) {
      return { reserveA: 0n, reserveB: 0n };
    }
    if (token0.toLowerCase() === readA.toLowerCase()) {
      return { reserveA: reserve0 ?? 0n, reserveB: reserve1 ?? 0n };
    }
    if (token1.toLowerCase() === readA.toLowerCase()) {
      return { reserveA: reserve1 ?? 0n, reserveB: reserve0 ?? 0n };
    }
    return { reserveA: 0n, reserveB: 0n };
  }, [token0, token1, reserve0, reserve1, tokenA, tokenB]);

  // valeur raw utilisée partout (previews + tx)
  const lpAmountRaw = useMemo(() => {
    if (lpRawOverride != null) return lpRawOverride; // % / Max exacts
    const s = tidyOnBlur(lpAmount, DECIMALS) || "0";
    try {
      return parseUnits(s, lpDecimals);
    } catch {
      return 0n;
    }
  }, [lpAmount, lpRawOverride]);

  // Previews (pro-rata)
  const previewA = useMemo(() => {
    if (!totalSupply || totalSupply === 0n) return "0";
    const raw = (reserveA * lpAmountRaw) / totalSupply;
    const dec = tokenInfoA?.decimals ?? 18;
    return formatUnits(raw, dec);
  }, [reserveA, totalSupply, lpAmountRaw, tokenInfoA?.decimals]);

  const previewB = useMemo(() => {
    if (!totalSupply || totalSupply === 0n) return "0";
    const raw = (reserveB * lpAmountRaw) / totalSupply;
    const dec = tokenInfoB?.decimals ?? 18;
    return formatUnits(raw, dec);
  }, [reserveB, totalSupply, lpAmountRaw, tokenInfoB?.decimals]);

  // Input change → reset override & clamp l'affichage
  function onInputChange(val: string) {
    setLpRawOverride(null);
    setLpAmount(clampDecimalsForInput(val, DECIMALS));
  }

  // Boutons %
  const setPercentage = (percent: number) => {
    if (!lpBalance) return;
    const raw = (lpBalance * BigInt(Math.floor(percent * 10000))) / 10000n;
    setLpRawOverride(raw); // précision parfaite
    const s = formatUnits(raw, lpDecimals);
    setLpAmount(clampDecimalsForInput(s, DECIMALS));
  };

  // Max exact
  const setMax = () => {
    if (!lpBalance) return;
    setLpRawOverride(lpBalance);
    const s = formatUnits(lpBalance, lpDecimals);
    setLpAmount(clampDecimalsForInput(s, DECIMALS));
  };

  const { removeLiquidity } = useLiquidityActions();

  async function handleRemoveLiquidity(amount: bigint) {
    if (!tokenA || !tokenB || !to) return; // to = wallet address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  
    // Slippage min (ici 0 pour exemple, tu peux calculer avec reserveA/reserveB)
    const amtAMin = 0n;
    const amtBMin = 0n;
  
    try {
      await removeLiquidity(
        tokenA,
        tokenB,
        amount,
        amtAMin,
        amtBMin,
        to,       // adresse du wallet
        deadline
      );
    } catch (err) {
      console.error("Failed to remove liquidity:", err);
    }
  }
  
  
  return (
    <div className={styles.bodyAddModal}>
      <div className={styles.inputRemoveContainer}>
        <div className={styles.tokenPairLogo}>
          <div className={styles.tokenIconContainer}>
            {tokenInfoA && (
              <img
                src={getTokenIcon(tokenInfoA.address)}
                alt={tokenInfoA.symbol}
                className={styles.tokenIcon}
              />
            )}
            {tokenInfoB && (
              <img
                src={getTokenIcon(tokenInfoB.address)}
                alt={tokenInfoB.symbol}
                className={styles.tokenIcon}
              />
            )}
          </div>
          <div className={styles.tokenNameContainer}>
            {tokenInfoA && <span>{tokenInfoA.symbol}</span>}/{tokenInfoB && <span>{tokenInfoB.symbol}</span>}
          </div>

          {/* Balance LP actuelle */}
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

        {/* Input + boutons % */}
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

      {/* Aperçu des montants récupérés pour la quantité saisie */}
      <div className={styles.wormholeContainerRemove}>
        <div className={styles.dataRemoveTokenA}>
          {tokenInfoA && (
            <img
              src={getTokenIcon(tokenInfoA.address)}
              alt={tokenInfoA.symbol}
              className={styles.tokenIconSmall}
            />
          )}
          + {formatAmountStr(previewA || "0", DECIMALS)}
        </div>

        <div className={styles.dataRemoveTokenB}>
          {tokenInfoB && (
            <img
              src={getTokenIcon(tokenInfoB.address)}
              alt={tokenInfoB.symbol}
              className={styles.tokenIconSmall}
            />
          )}
          + {formatAmountStr(previewB || "0", DECIMALS)}
        </div>

        <button onClick={() => handleRemoveLiquidity(lpAmountRaw)} className={styles.btnRemoveLiquidity}>Remove</button>

      </div>
    </div>
  );
}
