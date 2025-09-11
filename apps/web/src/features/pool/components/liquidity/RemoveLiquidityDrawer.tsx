import { useState, useMemo } from "react";
import type { Address } from "viem";
import { formatUnits } from "viem";
import styles from "../../modal.module.css";

import { TOKENLIST } from "../../../../lib/tokens";
import { getTokenIcon } from "../../../../lib/getTokenIcon";
import { useLpPosition } from "../../hooks/useLpPosition"; // ⬅️ le hook qu’on a fait

export function RemoveLiquidityDrawer({
  tokenA,
  tokenB,
  onClose,
  onRemoveLiquidity,
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
  onRemoveLiquidity: (amount: string) => Promise<void>;
}) {
  const [lpAmount, setLpAmount] = useState("");

  const tokenInfoA = useMemo(
    () => TOKENLIST.find((t) => t.address.toLowerCase() === tokenA?.toLowerCase()),
    [tokenA]
  );
  const tokenInfoB = useMemo(
    () => TOKENLIST.find((t) => t.address.toLowerCase() === tokenB?.toLowerCase()),
    [tokenB]
  );

  // 🔑 récupère la position LP réelle
  const { loading, lpBalance, totalSupply, sharePct, pooledA, pooledB } = useLpPosition(
    tokenA,
    tokenB
  );

  // helper pour appliquer un % de balance LP
  const setPercentage = (percent: number) => {
    if (!lpBalance) return;
    const raw = (lpBalance * BigInt(Math.floor(percent * 10000))) / 10000n; // pour précision
    setLpAmount(raw.toString());
  };

  const handleRemove = async () => {
    await onRemoveLiquidity(lpAmount);
    onClose();
  };

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
        </div>

        {/* Affichage position LP */}
        <div style={{ fontSize: 12, marginTop: 8, marginBottom: 8 }}>
          {loading ? (
            <div>Loading your LP…</div>
          ) : lpBalance && lpBalance > 0n ? (
            <>
              <div>Your LP tokens: {lpBalance.toString()}</div>
              <div>Share: {sharePct?.toFixed(4)}%</div>
              <div>
                Underlying ≈ {pooledA} {tokenInfoA?.symbol} + {pooledB} {tokenInfoB?.symbol}
              </div>
            </>
          ) : (
            <div>No LP tokens for this pool.</div>
          )}
        </div>

        {/* Input + boutons % */}
        <div className={styles.inputContainerLp}>
          <div className={styles.btnContainerLp}>
            <button onClick={() => setPercentage(0.25)}>25%</button>
            <button onClick={() => setPercentage(0.5)}>50%</button>
            <button onClick={() => setPercentage(0.75)}>75%</button>
            <button onClick={() => setPercentage(1)}>Max</button>
          </div>

          <input
            placeholder="0.00000"
            value={lpAmount}
            onChange={(e) => setLpAmount(e.target.value)}
            className={styles.inputRemoveLp}
          />
        </div>
      </div>

      <div className={styles.wormholeContainerRemove}>
        <div className={styles.dataRemoveTokenA}></div>
        <div className={styles.dataRemoveTokenB}></div>
        <button onClick={handleRemove} className={styles.btnRemoveLiquidity}>
          Remove
        </button>
      </div>
    </div>
  );
}
