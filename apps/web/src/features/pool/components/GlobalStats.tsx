import { formatUnits } from "viem";
import { useGlobalStats } from "../hooks/useGlobalStats";
import styles from "../pools.module.css";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statPool}>
      <span className={styles.titleStat}>{label}</span>
      <span className={styles.valueStat}>{value}</span>
    </div>
  );
}

const fmt18 = (x?: bigint) => (x !== undefined ? formatUnits(x, 18) : "0");

const pretty = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : s;
};

export default function GlobalStats() {
  const { data, loading, error } = useGlobalStats();

  if (error) return <div className="text-red-400 text-sm">Stats error: {error}</div>;

  const tvlStr = data ? fmt18(data.tvlWT) : "0";
  const volStr = data ? fmt18(data.vol24hWT) : "0";
  const txStr  = data ? String(data.tx24h) : "0";

  return (
    <div className={styles.statGlobalPool}>
      <Stat label="1d Volumes (TTRUST)" value={loading ? "…" : pretty(volStr)} />
      <div className={styles.lineStatGlobal}></div>
      <Stat label="TVL (TTRUST)"        value={loading ? "…" : pretty(tvlStr)} />
      <div className={styles.lineStatGlobal}></div>
      <Stat label="Nb Transaction (24h)" value={loading ? "…" : txStr} />
    </div>
  );
}
