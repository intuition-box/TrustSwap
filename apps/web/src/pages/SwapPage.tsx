import { useRef } from "react";
import styles from "@ui/styles/Swap.module.css";
import SwapFeature from "../features/swap";

export default function SwapPage() {
  const haloRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!haloRef.current) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    haloRef.current.style.left = `${x}px`;
    haloRef.current.style.top = `${y}px`;
    haloRef.current.style.opacity = "1";
  };

  const handleMouseLeave = () => {
    if (!haloRef.current) return;
    haloRef.current.style.opacity = "0";
  };

  return (
    <div className={styles.containerBody}>
      <div className={styles.halo}></div>
      <section className={styles.containerSwap}>
        <div className={styles.swapCard}
             onMouseMove={handleMouseMove}
             onMouseLeave={handleMouseLeave}>
          <div ref={haloRef} className={styles.followHalo}></div>
          <div className={styles.swapCardLineTop}></div>
          <SwapFeature />
          <div className={styles.swapCardLineBottom}></div>
        </div>
      </section>
    </div>
  );
}
