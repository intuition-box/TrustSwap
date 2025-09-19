import { useState, useEffect } from "react";
import styles from "@ui/styles/DetailsDisclosure.module.css";

export default function SlippagePopover({
  valueBps,
  onChangeBps,
}: {
  valueBps: number;
  onChangeBps: (v: number) => void;
}) {
  // convertir bps → string pour l'input (ex: 50 → "0.5")
  const [localValue, setLocalValue] = useState((valueBps / 100).toString());

  // sync si valueBps change depuis l'extérieur
  useEffect(() => {
    setLocalValue((valueBps / 100).toString());
  }, [valueBps]);

  function handleChange(raw: string) {
    // autoriser uniquement chiffres, . et ,
    let cleaned = raw.replace(/[^0-9.,]/g, "");

    // normaliser virgule → point
    cleaned = cleaned.replace(",", ".");

    // limiter à une seule virgule/point
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    // limiter à 2 décimales
    if (parts[1]) {
      cleaned = parts[0] + "." + parts[1].slice(0, 2);
    }

    setLocalValue(cleaned);

    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      onChangeBps(Math.round(num * 100)); // ex: 0.5 → 50 bps
    }
  }

  return (
    <div className={styles.containerSlippage}>
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className={styles.inputSlippage}
      />
      <span className={styles.percent}>%</span>
    </div>
  );
}
