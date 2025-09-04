import styles from "@ui/styles/Swap.module.css";

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
      className={styles.inputSwap}
    />
  );
}
