import { useState, useRef, useEffect, useMemo } from "react";
import type { Address } from "viem";
import { isAddress, getAddress, erc20Abi } from "viem";
import { usePublicClient } from "wagmi";
import { TOKENLIST, UI_TOKENLIST } from "../../../lib/tokens";
import styles from "@ui/styles/TokenSelector.module.css";
import arrowIcone from "../../../assets/arrow-selector.png";
import volIcone from "../../../assets/vol.png";
import deleteIcone from "../../../assets/delete.png";
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

const norm = (a?: string) => (typeof a === "string" ? a.toLowerCase() : "");
const eq = (a?: string, b?: string) => norm(a) === norm(b);
const checksum = (a: string): Address => {
  try {
    return getAddress(a as Address);
  } catch {
    return a as Address;
  }
};

export default function TokenSelector({
  value,
  onChange,
}: {
  value?: Address | "";
  onChange: (a: Address) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const pc = usePublicClient();

  // Base tokens
  const baseTokens: Token[] = useMemo(() => UI_TOKENLIST, []);

  // Imported tokens
  const {
    tokens: imported,
    add: addImported,
    remove: removeImported,
    byAddress,
  } = useImportedTokens();

  // Merge base + imported (dedupe)
  const allTokens: Token[] = useMemo(() => {
    const map = new Map<string, Token>();
    for (const t of baseTokens) map.set(norm(t.address), t);
    for (const t of imported) {
      const key = norm(t.address);
      if (!map.has(key)) map.set(key, t as Token);
    }
    return Array.from(map.values());
  }, [baseTokens, imported]);

  // sélection courante
  const selectedToken = useMemo(
    () => (value ? allTokens.find((t) => eq(t.address, value)) ?? null : null),
    [allTokens, value]
  );

  // Filtrage par recherche
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTokens;
    return allTokens.filter((t) => {
      const symbol = t.symbol?.toLowerCase() || "";
      const name = t.name?.toLowerCase() || "";
      const addr = (t.address || "").toLowerCase();
      return symbol.includes(q) || name.includes(q) || addr.includes(q);
    });
  }, [allTokens, query]);

  // Import possible ?
  const canShowImport = useMemo(() => {
    if (!query) return false;
    if (!isAddress(query as Address)) return false;
    const exists = allTokens.some((t) => eq(t.address, query));
    return !exists && !importing;
  }, [query, allTokens, importing]);

  // Pick
  const onPick = (addr: Address) => {
    onChange(addr);
    setOpen(false);
    setQuery("");
  };

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

  // Importer un token par adresse
  async function resolveAndImport(addr: Address) {
    const ca = checksum(addr);
    setImporting(true);
    try {
      let symbol = "UNKNOWN";
      let name: string | undefined = undefined;
      let decimals: number | undefined = undefined;

      if (pc) {
        try {
          const [s, n, d] = await Promise.all([
            pc.readContract({ address: ca, abi: erc20Abi, functionName: "symbol" }),
            pc.readContract({ address: ca, abi: erc20Abi, functionName: "name" }),
            pc.readContract({ address: ca, abi: erc20Abi, functionName: "decimals" }),
          ]);
          if (typeof s === "string" && s) symbol = s;
          if (typeof n === "string" && n) name = n;
          if (typeof d === "number") decimals = d;
        } catch {
          // ignore read errors
        }
      }

      addImported({ address: ca, symbol, name, decimals });
      onChange(ca);
      setOpen(false);
      setQuery("");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div ref={ref} className={styles.container}>
      <button
        type="button"
        className={styles.btnTokenSelector}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedToken && (
          <img
            src={getTokenIcon(selectedToken.address)}
            alt={selectedToken.symbol}
            className={styles.tokenIcon}
          />
        )}
{selectedToken ? (
  selectedToken.symbol
) : (
  <span className={styles.tokenPlaceholder}>Select token</span>
)}


        <img src={arrowIcone} alt="toggle" className={styles.arrowIcone} />
      </button>

      {open && (
        <div className={styles.dropdown}>
          <span className={styles.titleDropdown}>Select a Token</span>

          <SearchBar value={query} onChange={setQuery} />

      

          {canShowImport && (
            <ImportTokenRow
              query={query}
              onImport={() => resolveAndImport(checksum(query))}
              disabled={importing}
            />
          )}

          <div className={styles.list}>
            {filtered.map((t) => {
              const isImported = !!byAddress?.get?.(norm(t.address));
              const isSelected = value ? eq(t.address, value) : false;

              return (
                <div
                  key={t.address}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(checksum(t.address));
                  }}
                  className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                >
                  <img
                    src={getTokenIcon(t.address)}
                    alt={t.symbol}
                    className={styles.tokenIcon}
                  />

                  <span className={styles.nameTokenDropdown}>
                  {t.name && (
                      <span className={styles.tokenName}> {t.name}</span>
                    )}
                  <div className={styles.infoTokenSwap}>
                  <span className={styles.tokenSymbol}>{t.symbol}</span>
                  
                  <span className={styles.addr}>
                    {t.address.slice(0, 6)}…{t.address.slice(-4)}
                  </span>
                  </div>
                  </span>

                  {isImported && (
                    <span className={styles.labelImported}>Imported</span>
                  )}

                  {isImported && (
                    <button
                      className={styles.removeBtnSelected}
                      title="Remove imported token"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeImported(t.address as Address);
                      }}
                    >
                      <img
                        src={deleteIcone}
                        className={styles.deleteIcon}
                        alt="remove"
                      />
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
