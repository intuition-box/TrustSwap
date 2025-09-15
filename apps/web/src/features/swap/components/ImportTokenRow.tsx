import React, { useEffect, useState } from "react";
import type { Address } from "viem";
import { isAddress, erc20Abi } from "viem";
import { usePublicClient } from "wagmi";
import { getTokenIcon } from "../../../lib/getTokenIcon";
import styles from "@ui/styles/TokenSelector.module.css";

export function ImportTokenRow({
  query,
  onImport,
  disabled,
}: { query: string; onImport: () => void; disabled?: boolean }) {
  const pc = usePublicClient();
  const [symbol, setSymbol] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAddress(query as Address) || !pc) return;
    (async () => {
      try {
        const [s, n] = await Promise.all([
          pc.readContract({
            address: query as Address,
            abi: erc20Abi,
            functionName: "symbol",
          }),
          pc.readContract({
            address: query as Address,
            abi: erc20Abi,
            functionName: "name",
          }),
        ]);
        if (typeof s === "string") setSymbol(s);
        if (typeof n === "string") setName(n);
      } catch (e) {
        console.warn("Impossible de lire le token:", e);
      }
    })();
  }, [query, pc]);

  if (!isAddress(query as Address)) return null;

  return (
    <div className={styles.importRow}>
       <img
          src={getTokenIcon(query as Address)}
          alt={symbol || "token"}
          className={styles.tokenIconImport}
        />
      <div className={styles.importInfo}>
        {/* Logo */}

        <div className={styles.metaWrapper}>
          {/* Name si dispo */}
          {name && (
            <span className={styles.tokenMeta}>{name}</span>
          )}
         </div>
          <span className={styles.infoImport}>
            {/* Symbol si dispo */}
            {symbol && (
              <span className={styles.symbolImport}>{symbol}</span>
            )}
            {/* Adresse raccourcie */}
            {query.slice(0, 6)}…{query.slice(-4)}
          </span>
     
      </div>

      <button
        className={styles.importBtn}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) onImport();
        }}
        disabled={disabled}
      >
        Import
      </button>
    </div>
  );
}
