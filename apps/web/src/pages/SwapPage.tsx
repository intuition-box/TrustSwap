import styles from "@ui/styles/Swap.module.css";
import haloImg from "../assets/halo.png";

export default function SwapPage() {
  return (
    <section className={styles.containerSwap}>
      <img src={haloImg} alt="halo" className={styles.haloImg} />
      <div className={styles.swapCard}>
      </div>
    </section>
  );
}
