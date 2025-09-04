export default function SlippagePopover({
  valueBps, onChangeBps,
}: { valueBps: number; onChangeBps: (v: number) => void }) {
  // simple select (0.1%, 0.5%, 1%) + custom via input
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ opacity: 0.8, fontSize: 12 }}>Slippage</span>
      <select
        value={valueBps}
        onChange={(e) => onChangeBps(parseInt(e.target.value, 10))}
        style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #333", background: "rgba(0,0,0,0.1)" }}
      >
        <option value={10}>0.10%</option>
        <option value={50}>0.50%</option>
        <option value={100}>1.00%</option>
      </select>
    </div>
  );
}
