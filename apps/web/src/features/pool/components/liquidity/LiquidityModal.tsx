import { useState, useRef, useEffect } from "react";
import type { Address } from "viem";
import { AddLiquidityDrawer } from "./AddLiquidityDrawer";
import { RemoveLiquidityDrawer } from "./RemoveLiquidityDrawer";
import { useTokenMeta } from "../../../../hooks/useTokenMeta";
import styles from "../../modal.module.css";

export function LiquidityModal({
  tokenA,
  tokenB,
  onClose,
  initialTab = "add",
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
  initialTab?: "add" | "remove";
}) {
  const [tab, setTab] = useState<"add" | "remove">(initialTab);
  const [closing, setClosing] = useState(false);
  const [pending, setPending] = useState(false);

  const addRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const [bgStyle, setBgStyle] = useState({ width: 0, left: 0 });

  // 🔐 charge les métas une seule fois ici
  const a = useTokenMeta(tokenA);
  const b = useTokenMeta(tokenB);
  const loading = a.loading || b.loading;

  const handleClose = () => {
    if (pending) return; // empêche la fermeture pendant une tx
    setClosing(true);
    setTimeout(onClose, 300);
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
    <div onClick={handleClose} className={`${styles.popUpLiquidity} ${closing ? styles.closing : ""}`}>
      <div onClick={(e) => e.stopPropagation()} className={styles.popUpBody}>
        <div className={styles.headerLiquidityPopUp}>
          <div className={styles.headerChoiceLiquidity}>
            <div className={styles.activeBg} style={{ width: bgStyle.width, left: bgStyle.left }} />
            <button ref={addRef} className={tab === "add" ? styles.activeTab : styles.inactiveTab} onClick={() => setTab("add")} disabled={pending}>
              Add Liquidity
            </button>
            <button ref={removeRef} className={tab === "remove" ? styles.activeTab : styles.inactiveTab} onClick={() => setTab("remove")} disabled={pending}>
              Remove
            </button>
          </div>
          <button onClick={handleClose} className={styles.btnCloseModal} disabled={pending}>✕</button>
        </div>

        {loading ? (
          <div className={styles.skeleton}>Loading token metadata…</div>
        ) : tab === "add" ? (
          <AddLiquidityDrawer
            tokenA={tokenA}
            tokenB={tokenB}
            metaA={a.meta}
            metaB={b.meta}
            onPendingChange={setPending}
          />
        ) : (
          <RemoveLiquidityDrawer
            tokenA={tokenA}
            tokenB={tokenB}
            metaA={b.meta && a.meta ? a.meta : a.meta} 
            metaB={b.meta}
            onPendingChange={setPending}
          />
        )}
      </div>
    </div>
  );
}
