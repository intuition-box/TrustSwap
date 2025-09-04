import { useState, useRef, useEffect } from "react";
import type { Address } from "viem";
import { TOKENLIST } from "../../../lib/tokens";
import styles from "@ui/styles/TokenSelector.module.css";
import searchIcone from "../../../assets/search.png";

export default function TokenSelector({
  value,
  onChange,
}: {
  value: Address;
  onChange: (a: Address) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedToken = TOKENLIST.find((t) => t.address === value);

  return (
    <div ref={ref} className={styles.container}>
      <button
        className={styles.button}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedToken
          ? `${selectedToken.symbol} — ${selectedToken.address.slice(0, 6)}…${selectedToken.address.slice(-4)}`
          : "Select token"}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <span className={styles.titleDropdown}>Select a Token</span>
          <span className={styles.searchBarSelector}>
          <img
              src={searchIcone}
              alt="wallet"
              className={styles.searchIcone}
            />
            <span className={styles.placeholderInput}>Search by token, address ...</span>
          </span>
          {TOKENLIST.map((t) => (
            <div
              key={t.address}
              onClick={() => {
                onChange(t.address);
                setOpen(false);
              }}
              className={`${styles.item} ${t.address === value ? styles.selected : ""}`}
            >
              {t.symbol} — {t.address.slice(0, 6)}…{t.address.slice(-4)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
