import { formatUnits } from "viem";
import { useGlobalStats } from "../hooks/useGlobalStats";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start px-4 py-2 border-l border-white/10 first:border-l-0">
      <span className="text-white/60 text-sm">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

// 🔒 util d'affichage: bigint(18) -> string
const fmt18 = (x?: bigint) => (x !== undefined ? formatUnits(x, 18) : "0");

// optionnel: mise en forme "jolie"
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
    <div className="w-full bg-black/20 rounded-xl px-2 py-3 mb-6 flex gap-8">
      <Stat label="1d Volumes (TTRUST)" value={loading ? "…" : pretty(volStr)} />
      <Stat label="TVL (TTRUST)"        value={loading ? "…" : pretty(tvlStr)} />
      <Stat label="Nb Tx (24h)" value={loading ? "…" : txStr} />
    </div>
  );
}
