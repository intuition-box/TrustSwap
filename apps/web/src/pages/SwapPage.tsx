import styles from "@ui/styles/Swap.module.css";
import SwapFeature from "../features/swap";

export default function SwapPage() {
  return (
    <section className={styles.containerSwap}>
     <div className={styles.halo}></div>
     <div className={styles.swapCard}>
      <SwapFeature />
     </div>
    </section>
  );
}