export default function AmountInput({
  value, onChange, readOnly, placeholder,
}: { value: string; onChange?: (v: string) => void; readOnly?: boolean; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      inputMode="decimal"
      style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #333", background: "rgba(0,0,0,0.1)", textAlign: "right" }}
    />
  );
}
