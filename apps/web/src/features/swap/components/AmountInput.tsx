import { useEffect, useRef } from "react";
import styles from "@ui/styles/Swap.module.css";

export default function AmountInput({
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // focus automatique au montage si non readonly
  useEffect(() => {
    if (!readOnly) {
      inputRef.current?.focus();
    }
  }, [readOnly]);

  function handleChange(raw: string) {
    // Autoriser seulement chiffres + point/virgule
    let cleaned = raw.replace(/[^0-9.,]/g, "");

    // Normaliser virgule → point
    cleaned = cleaned.replace(",", ".");

    // Limiter à une seule virgule/point
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    // Limiter à 5 décimales
    if (parts[1]) {
      cleaned = parts[0] + "." + parts[1].slice(0, 5);
    }

    onChange?.(cleaned);
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      inputMode="decimal"
      className={styles.inputSwap}
    />
  );
}
