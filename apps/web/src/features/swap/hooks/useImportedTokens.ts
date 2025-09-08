import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";

export type ImportedToken = {
  address: Address;
  symbol: string;
  name?: string;
  decimals?: number;
};

const BASE_KEY = "ts:importedTokens";

function safeStorage(): Storage | null {
  try {
    const k = "__ts_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return null;
  }
}

export function useImportedTokens(opts?: { chainId?: number }) {
  const ls = typeof window !== "undefined" ? safeStorage() : null;
  const key = opts?.chainId ? `${BASE_KEY}:${opts.chainId}` : BASE_KEY;
  const LOCAL_EVT = `${key}:sync`;

  const [tokens, setTokens] = useState<ImportedToken[]>([]);
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Lecture initiale (synchro pour éviter le "flash")
  useLayoutEffect(() => {
    if (!ls) return;
    try {
      const raw = ls.getItem(key);
      setTokens(raw ? JSON.parse(raw) : []);
    } catch {
      setTokens([]);
    }
  }, [ls, key]);

  // Abonnements: storage (autres onglets), BroadcastChannel (même onglet autres instances), CustomEvent (fallback)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== key) return;
      try {
        setTokens(e.newValue ? JSON.parse(e.newValue) : []);
      } catch {}
    }
    window.addEventListener("storage", onStorage);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(key);
      bcRef.current = bc;
      bc.onmessage = (ev) => {
        const data = ev?.data;
        if (data?.type === "sync" && Array.isArray(data.tokens)) {
          setTokens(data.tokens);
        }
      };
    }

    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tokens?: ImportedToken[] } | undefined;
      if (detail && Array.isArray(detail.tokens)) setTokens(detail.tokens);
    };
    window.addEventListener(LOCAL_EVT, onLocal as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_EVT, onLocal as EventListener);
      if (bc) {
        bc.close();
        bcRef.current = null;
      }
    };
  }, [key, LOCAL_EVT]);

  function commit(next: ImportedToken[]) {
    if (ls) {
      try {
        ls.setItem(key, JSON.stringify(next));
      } catch {}
    }
    if (bcRef.current) {
      try {
        bcRef.current.postMessage({ type: "sync", tokens: next });
      } catch {}
    }
    try {
      window.dispatchEvent(new CustomEvent(LOCAL_EVT, { detail: { tokens: next } }));
    } catch {}
  }

  function add(token: ImportedToken) {
    setTokens((prev) => {
      const exists = prev.some(
        (t) => t.address.toLowerCase() === token.address.toLowerCase()
      );
      if (exists) return prev;
      const next = [token, ...prev];
      commit(next);         // ⬅️ notifie les autres instances
      return next;
    });
  }

  function remove(address: Address) {
    setTokens((prev) => {
      const next = prev.filter(
        (t) => t.address.toLowerCase() !== address.toLowerCase()
      );
      if (next.length !== prev.length) commit(next); // ⬅️ notifie les autres instances
      return next;
    });
  }

  const byAddress = useMemo(
    () => new Map(tokens.map((t) => [t.address.toLowerCase(), t])),
    [tokens]
  );

  return { tokens, add, remove, byAddress };
}
