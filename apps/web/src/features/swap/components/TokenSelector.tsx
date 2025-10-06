// apps/web/src/features/pools/components/TokenSelector.tsx
import { useState, useRef, useEffect, useMemo } from "react";
import type { Address } from "viem";
import { isAddress, getAddress, erc20Abi } from "viem";
import { usePublicClient } from "wagmi";
import { INTUITION } from "@trustswap/sdk"; // fallback chain id
import { TOKENLIST } from "../../../lib/tokens";
import styles from "@ui/styles/TokenSelector.module.css";
import arrowIcone from "../../../assets/arrow-selector.png";
import deleteIcone from "../../../assets/delete.png";
import { getTokenIcon } from "../../../lib/getTokenIcon";
import { SearchBar } from "./SearchBar";
import { ImportTokenRow } from "./ImportTokenRow";
import { useImportedTokens } from "../hooks/useImportedTokens";
import { TrustGaugePopoverContainer } from "../../trust-gauge/components/TrustGaugePopoverContainer";
import { shouldHideToken } from "../../../lib/tokenFilters";
import { MULTIVAULT_ADDRESS } from "../../trust-gauge/config";

type Token = {
  address: Address;
  symbol: string;
  name?: string;
  decimals?: number;
  hidden?: boolean;
  tags?: string[];
  status?: "active" | "test" | "blocked";
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
  tokens,
}: {
  value?: Address | "";
  onChange: (a: Address) => void;
  tokens?: Token[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const pc = usePublicClient();

  // Use chain id from wagmi public client (fallback to INTUITION id)
  const chainId = (pc?.chain?.id as number | undefined) ?? INTUITION.id;

  // Base tokens (props > TOKENLIST)
  const baseTokens: Token[] = useMemo(
    () => (tokens && tokens.length ? tokens : (TOKENLIST as unknown as Token[])),
    [tokens]
  );

  // Imported tokens (user)
  const {
    tokens: imported,
    add: addImported,
    remove: removeImported,
    byAddress,
  } = useImportedTokens();

  const importedSet = useMemo(
    () => new Set((imported ?? []).map((t: any) => norm(t.address))),
    [imported]
  );

  // Merge base + imported
  const mergedTokens: Token[] = useMemo(() => {
    const map = new Map<string, Token>();
    for (const t of baseTokens) map.set(norm(t.address), t);
    for (const t of imported) {
      const key = norm((t as any).address);
      if (!map.has(key)) map.set(key, t as Token);
    }
    return Array.from(map.values());
  }, [baseTokens, imported]);

  const visibleTokens: Token[] = useMemo(() => {
    return mergedTokens.filter((t) => {
      if (!t) return false;
      if (t.hidden) return false;

      return !shouldHideToken(
        {
          address: t.address,
          symbol: t.symbol,
          decimals: t.decimals,
          tags: t.tags,
          status: t.status as any,
        },
        {
          includeTest: false,
          allowImported: false,
          importedAddresses: importedSet,
        }
      );
    });
  }, [mergedTokens, importedSet]);

  const selectedToken = useMemo(
    () => (value ? visibleTokens.find((t) => eq(t.address, value)) ?? null : null),
    [visibleTokens, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleTokens;
    return visibleTokens.filter((t) => {
      const symbol = t.symbol?.toLowerCase() || "";
      const name = t.name?.toLowerCase() || "";
      const addr = (t.address || "").toLowerCase();
      return symbol.includes(q) || name.includes(q) || addr.includes(q);
    });
  }, [visibleTokens, query]);

  const canShowImport = useMemo(() => {
    if (!query) return false;
    if (!isAddress(query as Address)) return false;

    const candidate = checksum(query);
    const exists = mergedTokens.some((t) => eq(t.address, candidate));
    if (exists || importing) return false;

    const blocked = shouldHideToken(
      { address: candidate, symbol: "", decimals: 18 },
      { includeTest: false, allowImported: false }
    );
    return !blocked;
  }, [query, mergedTokens, importing]);

  const onPick = (addr: Address) => {
    const t = visibleTokens.find((x) => eq(x.address, addr));
    if (!t) return;
    onChange(checksum(addr));
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function resolveAndImport(addr: Address) {
    const ca = checksum(addr);

    const blocked = shouldHideToken(
      { address: ca, symbol: "", decimals: 18 },
      { includeTest: false, allowImported: false }
    );
    if (blocked) return;

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
          // Silently ignore read failures
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
                  className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                  onMouseDown={(e) => {
                    // Don't select the row if the click happened inside an interactive zone (popover)
                    const target = e.target as HTMLElement;
                    if (target.closest('[data-stop-row-select]')) {
                      return; // let the popover/button handle it
                    }
                    e.preventDefault();
                    onPick(checksum(t.address));
                  }}
                >

                  {/* Wrap the popover so we can mark it as "do not trigger row select" */}
                  <div data-stop-row-select>
                    <TrustGaugePopoverContainer
                      chainId={(pc?.chain?.id ?? 13579)}
                      multivault={MULTIVAULT_ADDRESS}
                      tokenAddress={t.address as `0x${string}`}
                      icon={<img src={getTokenIcon(t.address)} alt={t.symbol} className={styles.tokenIcon} />}
                    />
                  </div>

                  <span className={styles.nameTokenDropdown}>
                    {t.name && <span className={styles.tokenName}>{t.name}</span>}

                    <div className={styles.infoTokenSwap}>
                      <span className={styles.tokenSymbol}>{t.symbol}</span>
                      <span className={styles.addr}>
                        {t.address.slice(0, 6)}…{t.address.slice(-4)}
                      </span>
                    </div>
                  </span>

                  {isImported && <span className={styles.labelImported}>Imported</span>}

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
                      <img src={deleteIcone} className={styles.deleteIcon} alt="remove" />
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
