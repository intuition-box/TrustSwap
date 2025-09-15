import { useState, useRef, useEffect } from "react";
import type { Address } from "viem";
import { AddLiquidityDrawer } from "./AddLiquidityDrawer";
import { RemoveLiquidityDrawer } from "./RemoveLiquidityDrawer";
import styles from "../../modal.module.css";

export function LiquidityModal({
  tokenA,
  tokenB,
  onClose,
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"add" | "remove">("add");
  const [closing, setClosing] = useState(false);

  const addRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const [bgStyle, setBgStyle] = useState({ width: 0, left: 0 });

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 400);
  };

  const handleRemoveLiquidity = async (amount: string) => {
    try {
      console.log("Removing liquidity:", amount);
      // TODO: call smart contract ici
    } catch (err) {
      console.error("Erreur removeLiquidity:", err);
    }
  };

  useEffect(() => {
    const activeEl = tab === "add" ? addRef.current : removeRef.current;
    if (activeEl) {
      const rect = activeEl.getBoundingClientRect();
      const parentRect = activeEl.parentElement!.getBoundingClientRect();
      setBgStyle({ width: rect.width, left: rect.left - parentRect.left });
    }
  }, [tab]);

  return (
    <div
      onClick={handleClose}
      className={`${styles.popUpLiquidity} ${closing ? styles.closing : ""}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={styles.popUpBody}
      >
        <div className={styles.headerLiquidityPopUp}>
          <div className={styles.headerChoiceLiquidity}>
            <div
              className={styles.activeBg}
              style={{ width: bgStyle.width, left: bgStyle.left }}
            />
            <button
              ref={addRef}
              className={tab === "add" ? styles.activeTab : styles.inactiveTab}
              onClick={() => setTab("add")}
            >
              Add Liquidity
            </button>
            <button
              ref={removeRef}
              className={tab === "remove" ? styles.activeTab : styles.inactiveTab}
              onClick={() => setTab("remove")}
            >
              Remove
            </button>
          </div>

          <button onClick={handleClose} className={styles.btnCloseModal}>
            ✕
          </button>
        </div>

        {tab === "add" ? (
          <AddLiquidityDrawer tokenA={tokenA} tokenB={tokenB} />
        ) : (
          <RemoveLiquidityDrawer
            tokenA={tokenA}
            tokenB={tokenB}
            onRemoveLiquidity={handleRemoveLiquidity}
          />
        )}
      </div>
    </div>
  );
}
