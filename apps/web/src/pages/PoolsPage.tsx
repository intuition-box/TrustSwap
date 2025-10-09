import PoolsFeature from "../features/pool";
import styles from "../features/pool/pools.module.css";

export default function PoolsPage() {
  return (
    <div className={styles.containerBody}>
    <section className={styles.sectionPool}>

      <div className="rounded-2xl border border-white/10 p-4">
        <PoolsFeature />
      </div>
    </section>
    </div>
  );
}
