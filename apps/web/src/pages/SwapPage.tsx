import { useRef } from "react";
import styles from "@ui/styles/Swap.module.css";
import SwapFeature from "../features/swap";

export default function SwapPage() {
  const haloRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!haloRef.current) return;
    const x = e.clientX;
    const y = e.clientY;
    haloRef.current.style.left = `${x}px`;
    haloRef.current.style.top = `${y}px`;
    haloRef.current.style.opacity = "1";
  };

  const handleMouseLeave = () => {
    if (!haloRef.current) return;
    haloRef.current.style.opacity = "0";
  };

  return (
    <div
      className={styles.containerBody}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.halo}></div>
      <div ref={haloRef} className={styles.followHalo}></div> {/* halo global */}
      <section className={styles.containerSwap}>
        <div className={styles.swapCard}>
          <div className={styles.swapCardLineTop}></div>
          <SwapFeature />
          <div className={styles.swapCardLineBottom}></div>
        </div>
      </section>
    </div>
  );
}
