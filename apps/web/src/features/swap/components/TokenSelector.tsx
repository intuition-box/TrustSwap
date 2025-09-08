import { useState, useRef, useEffect, useMemo } from "react";
import type { Address } from "viem";
import { isAddress } from "viem";
import { TOKENLIST } from "../../../lib/tokens";
import styles from "@ui/styles/TokenSelector.module.css";
import arrowIcone from "../../../assets/arrow-selector.png";
import volIcone from "../../../assets/vol.png";
import { getTokenIcon } from "../../../lib/getTokenIcon";
import { SearchBar } from "./SearchBar";
import { ImportTokenRow } from "./ImportTokenRow";
import { useImportedTokens } from "../hooks/useImportedTokens";

type Token = {
  address: Address;
  symbol: string;
  name?: string;
  decimals?: number;
  hidden?: boolean;
};

export default function TokenSelector({
  value,
  onChange,
}: {
  value: Address;
  onChange: (a: Address) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { tokens: imported, add: addImported, remove: removeImported, byAddress } =
    useImportedTokens();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Base tokens (visible only)
  const baseTokens: Token[] = useMemo(
    () => TOKENLIST.filter((t) => !t.hidden),
    []
  );

  // Merge base + imported (dedupe by address)
  const allTokens: Token[] = useMemo(() => {
    const map = new Map<string, Token>();
    for (const t of baseTokens) map.set(t.address.toLowerCase(), t);
    for (const t of imported) {
      const key = t.address.toLowerCase();
      if (!map.has(key)) map.set(key, t as Token);
    }
    return Array.from(map.values());
  }, [baseTokens, imported]);

  const selectedToken = useMemo(
    () => allTokens.find((t) => t.address === value),
    [allTokens, value]
  );

  // Filtering by query (symbol | name | address)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTokens;

    return allTokens.filter((t) => {
      const symbol = t.symbol?.toLowerCase() || "";
      const name = t.name?.toLowerCase() || "";
      const addr = t.address.toLowerCase();
      return (
        symbol.includes(q) || name.includes(q) || addr.includes(q)
      );
    });
  }, [allTokens, query]);

  // Is the query a valid ERC-20 address not already listed?
  const canShowImport = useMemo(() => {
    if (!isAddress(query as Address)) return false;
    const exists =
      allTokens.some((t) => t.address.toLowerCase() === query.toLowerCase());
    return !exists;
  }, [query, allTokens]);

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

        <img src={arrowIcone} alt="toggle" className={styles.arrowIcone} />
        <div className={styles.lineSelectorBottom}></div>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <span className={styles.titleDropdown}>Select a Token</span>

          {/* Search */}
          <SearchBar value={query} onChange={setQuery} />

          {/* If the query is a valid address not already present, offer import */}
          {canShowImport && (
            <ImportTokenRow
              query={query}
              onImport={(t) => addImported({ ...t })}
            />
          )}

          <span className={styles.titleSearchToken}>
            <img src={volIcone} alt="volume" className={styles.volIcone} />
            Tokens by 24h Volume
          </span>

          {/* Token list */}
          <div className={styles.list}>
            {filtered.map((t) => {
              const lower = t.address.toLowerCase();
              const isImported = !!byAddress.get(lower as Address);
              return (
                <div
                  key={t.address}
                  onClick={() => {
                    onChange(t.address);
                    setOpen(false);
                    setQuery("");
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
                  <span className={styles.tokenSymbol}>{t.symbol}</span>
                  <span className={styles.addr}>
                    {t.address.slice(0, 6)}…{t.address.slice(-4)}
                  </span>

                  {isImported && (
                    <button
                      className={styles.removeBtn}
                      title="Remove imported token"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImported(t.address as Address);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && !canShowImport && (
              <div className={styles.empty}>No matching tokens</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
