import styles from "@ui/styles/Swap.module.css";
import SwapFeature from "../features/swap";

export default function SwapPage() {

  return (
    <section>
     <div className={styles.swapCard}>
      <SwapFeature />
     </div>
    </section>
  );
}