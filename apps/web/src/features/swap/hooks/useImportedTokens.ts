// useImportedTokens.ts
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";

export type ImportedToken = {
  address: Address;
  symbol: string;
  name?: string;
  decimals?: number;
};

const BASE_KEY = "ts:importedTokens";

function safeStorage() {
  try {
    const testKey = "__ts_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJSON<T>(ls: Storage, key: string, fallback: T): T {
  try {
    const raw = ls.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(ls: Storage, key: string, value: unknown) {
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch {
    // quota/full/blocked → ignore mais garde l'état en mémoire
  }
}

export function useImportedTokens(opts?: { chainId?: number }) {
  const ls = typeof window !== "undefined" ? safeStorage() : null;
  const key = (opts?.chainId ? `${BASE_KEY}:${opts.chainId}` : BASE_KEY);

  const [tokens, setTokens] = useState<ImportedToken[]>([]);
  const dirtyRef = useRef(false);

  // Lecture initiale synchro pour éviter le "flash" sans tokens
  useLayoutEffect(() => {
    if (!ls) return;
    const initial = readJSON<ImportedToken[]>(ls, key, []);
    setTokens(initial);
  }, [ls, key]);

  // Écriture dès qu'on modifie tokens
  useEffect(() => {
    if (!ls) return;
    if (!dirtyRef.current) return;
    writeJSON(ls, key, tokens);
    dirtyRef.current = false;
  }, [ls, key, tokens]);

  const byAddress = useMemo(
    () => new Map(tokens.map((t) => [t.address.toLowerCase(), t])),
    [tokens]
  );

  function add(token: ImportedToken) {
    setTokens((prev) => {
      const exists = prev.some(
        (t) => t.address.toLowerCase() === token.address.toLowerCase()
      );
      if (exists) return prev;
      dirtyRef.current = true;
      return [token, ...prev];
    });
  }

  function remove(address: Address) {
    setTokens((prev) => {
      const next = prev.filter(
        (t) => t.address.toLowerCase() !== address.toLowerCase()
      );
      if (next.length !== prev.length) dirtyRef.current = true;
      return next;
    });
  }

  // Option pour forcer une sauvegarde immédiate (utile juste après un import)
  function flush() {
    if (!ls) return;
    writeJSON(ls, key, tokens);
    dirtyRef.current = false;
  }

  return { tokens, add, remove, byAddress, flush, storageAvailable: !!ls };
}
