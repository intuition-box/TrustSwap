import { useState } from "react";
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

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 400);
  };

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
            <button
              className={tab === "add" ? styles.activeTab : styles.inactiveTab}
              onClick={() => setTab("add")}
            >
              Add Liquidity
            </button>
            <button
              className={tab === "remove" ? styles.activeTab : styles.inactiveTab}
              onClick={() => setTab("remove")}
            >
              Remove
            </button>
          </div>

          <button onClick={handleClose}>✕</button>
        </div>

        {tab === "add" ? (
          <AddLiquidityDrawer tokenA={tokenA} tokenB={tokenB} onClose={handleClose} />
        ) : (
          <RemoveLiquidityDrawer tokenA={tokenA} tokenB={tokenB} onClose={handleClose} />
        )}
      </div>
    </div>
  );
}
