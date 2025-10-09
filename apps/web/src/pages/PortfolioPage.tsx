import PortfolioFeature from "../features/portfolio";
import styles from "../features/pool/pools.module.css";

export default function PortfolioPageWrapper() {
  return (
    <section className={styles.containerBody}>
      <div className="rounded-2xl border border-white/10 p-4">
        <PortfolioFeature />
      </div>
    </section>
  );
}
