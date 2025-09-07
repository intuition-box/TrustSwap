import { useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";
import { TOKENLIST } from "../../../../lib/tokens";
import { getTokenIcon } from "../../../../lib/getTokenIcon";
import styles from "../../modal.module.css";
import wormhole from "../../../../assets/wormhole.png";

export function AddLiquidityDrawer({
  tokenA,
  tokenB,
  onClose,
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
}) {
  const { address: to } = useAccount();
  const { addLiquidity } = useLiquidityActions();
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  // 🔎 Cherche les infos dans TOKENLIST
  const infoA = TOKENLIST.find((t) => t.address === tokenA);
  const infoB = TOKENLIST.find((t) => t.address === tokenB);

  async function onSubmit() {
    if (!tokenA || !tokenB || !to) return;
    await addLiquidity(
      tokenA,
      tokenB,
      parseUnits(amountA || "0", 18),
      parseUnits(amountB || "0", 18),
      0n,
      0n,
      to,
      Math.floor(Date.now() / 1000) // deadline retiré
    );
    onClose();
  }

  return (
    <div className={styles.bodyAddModal}>
      <div className={styles.inputAddLiquidityContainer}>
        <div className={styles.inputAddContainer}>
          <div className={styles.labelTokenAdd}>
            <div className={styles.lineTokenTop}></div>
            {infoA && (
              <>
                <img
                  src={getTokenIcon(infoA.address)}
                  alt={infoA.symbol}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    marginRight: 6,
                  }}
                />
                <span>{infoA.symbol}</span>
              </>
            )}
            <div className={styles.lineTokenBottom}></div>
          </div>
          <input
            placeholder={`0.00000`}
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            className={styles.inputAdd}
          />
        </div>

        <div className={styles.inputAddContainer}>
          <div className={styles.labelTokenAdd}>
            <div className={styles.lineTokenTop}></div>
            {infoB && (
              <>
                <img
                  src={getTokenIcon(infoB.address)}
                  alt={infoB.symbol}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    marginRight: 6,
                  }}
                />
                <span>{infoB.symbol}</span>
              </>
            )}
            <div className={styles.lineTokenBottom}></div>
          </div>
          <input
            placeholder={`0.00000`}
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            className={styles.inputAdd}
          />
        </div>
      </div>

      {infoB && (
        <>
          <img
            src={getTokenIcon(infoB.address)}
            alt={infoB.symbol}
            className={styles.tokenImgWorLeft}
          />
        </>
      )}

      {infoA && (
        <>
          <img
            src={getTokenIcon(infoA.address)}
            alt={infoA.symbol}
            className={styles.tokenImgWorRight}
          />
        </>
      )}

      <div className={styles.wormholeContainer}>
        <button onClick={onSubmit} className={styles.btnAddLiquidity}>
          Add Liquidity
        </button>
      </div>
    </div>
  );
}
