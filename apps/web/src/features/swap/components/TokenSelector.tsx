import type { Address } from "viem";
import { TOKENLIST } from "../../../lib/tokens";

export default function TokenSelector({
  value, onChange,
}: { value: Address; onChange: (a: Address) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Address)}
      style={{ flex: 1, minWidth: 180, padding: 10, borderRadius: 10, border: "1px solid #333", background: "rgba(0,0,0,0.1)" }}
    >
      {TOKENLIST.map(t => (
        <option key={t.address} value={t.address}>
          {t.symbol} — {t.address.slice(0,6)}…{t.address.slice(-4)}
        </option>
      ))}
    </select>
  );
}
