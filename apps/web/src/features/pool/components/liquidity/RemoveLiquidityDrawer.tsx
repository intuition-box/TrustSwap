import { useState, useMemo } from "react";
import type { Address } from "viem";
import { formatUnits } from "viem";
import styles from "../../modal.module.css";

import { TOKENLIST } from "../../../../lib/tokens";
import { getTokenIcon } from "../../../../lib/getTokenIcon";
import { useLpPosition } from "../../hooks/useLpPosition";

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

  const { loading, lpBalance, totalSupply, sharePct, pooledA, pooledB } = useLpPosition(
    tokenA,
    tokenB
  );

  const setPercentage = (percent: number) => {
    if (!lpBalance) return;
    const raw = (lpBalance * BigInt(Math.floor(percent * 10000))) / 10000n;
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
          <div className={styles.balanceLpData}>
          {loading ? (
            <div className={styles.skeleton}></div>
          ) : lpBalance && lpBalance > 0n ? (
            <>
              <div>Balance LP: {lpBalance.toString()}</div>
            </>
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
        <div className={styles.dataRemoveTokenA}>
          {tokenInfoA && (
            <img
              src={getTokenIcon(tokenInfoA.address)}
              alt={tokenInfoA.symbol}
              className={styles.tokenIconSmall}
            />
          )}
          + {pooledA ? Number(pooledA).toFixed(6) : "0.00000000"}
        </div>

        <div className={styles.dataRemoveTokenB}>
          {tokenInfoB && (
            <img
              src={getTokenIcon(tokenInfoB.address)}
              alt={tokenInfoB.symbol}
              className={styles.tokenIconSmall}
            />
          )}
          + {pooledB ? Number(pooledB).toFixed(6) : "0.00000000"}
        </div>

        <button onClick={handleRemove} className={styles.btnRemoveLiquidity}>
          Remove
        </button>
      </div>
    </div>
  );
}
