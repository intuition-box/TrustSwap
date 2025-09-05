import { useState, useRef, useEffect } from "react";
import type { Address } from "viem";
import { TOKENLIST } from "../../../lib/tokens";
import styles from "@ui/styles/TokenSelector.module.css";
import searchIcone from "../../../assets/search.png";
import arrowIcone from "../../../assets/arrow-selector.png";
import volIcone from "../../../assets/vol.png";
import { getTokenIcon } from "../../../lib/getTokenIcon";

export default function TokenSelector({
  value,
  onChange,
}: {
  value: Address;
  onChange: (a: Address) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className={styles.btnTokenSelector}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className={styles.lineSelectorTop}></div>
        {selectedToken && (
          <img
            src={getTokenIcon(selectedToken.address)}
            alt={selectedToken.symbol}
            className={styles.tokenIcon}
          />
        )}
        {selectedToken ? selectedToken.symbol : "Select token"}
        <img
              src={arrowIcone}
              alt="search"
              className={styles.arrowIcone}
            />
                    <div className={styles.lineSelectorBottom}></div>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <span className={styles.titleDropdown}>Select a Token</span>
          <span className={styles.searchBarSelector}>
            <img
              src={searchIcone}
              alt="search"
              className={styles.searchIcone}
            />
            <span className={styles.placeholderInput}>
              Search by token, address ...
            </span>
          </span>

          <span className={styles.titleSearchToken}>
          <img
              src={volIcone}
              alt="search"
              className={styles.volIcone}
            />
          Tokens by 24h Volume
          </span>
          {TOKENLIST.map((t) => (
            <div
              key={t.address}
              onClick={() => {
                onChange(t.address);
                setOpen(false);
              }}
              className={`${styles.item} ${
                t.address === value ? styles.selected : ""
              }`}
            >
              <img
                src={getTokenIcon(t.address)}
                alt={t.symbol}
                className={styles.tokenIcon}
              />
              <span>{t.symbol}</span>
              <span className={styles.addr}>
                {t.address.slice(0, 6)}…{t.address.slice(-4)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
