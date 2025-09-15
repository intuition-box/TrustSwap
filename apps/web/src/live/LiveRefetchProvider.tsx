// apps/web/src/live/LiveRefetchProvider.tsx
import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useBlockNumber, usePublicClient } from "wagmi";

type Reloader = () => void;
type Ctx = {
  register: (fn: Reloader) => () => void;
  triggerAll: () => void;
};

const LiveCtx = createContext<Ctx | null>(null);

export function LiveRefetchProvider({ children }: { children: React.ReactNode }) {
  const fnsRef = useRef<Set<Reloader>>(new Set());
  const register = useCallback((fn: Reloader) => {
    fnsRef.current.add(fn);
    return () => { fnsRef.current.delete(fn); };
  }, []);
  const triggerAll = useCallback(() => {
    for (const fn of Array.from(fnsRef.current)) {
      try { fn(); } catch {}
    }
  }, []);

  // 🔔 refetch à chaque nouveau bloc
  const { data: block } = useBlockNumber({ watch: true });
  useEffect(() => { triggerAll(); }, [block, triggerAll]);

  return (
    <LiveCtx.Provider value={{ register, triggerAll }}>
      {children}
    </LiveCtx.Provider>
  );
}

// Hook pour s'abonner
export function useLiveRegister(fn: Reloader | null | undefined) {
  const ctx = useContext(LiveCtx);
  useEffect(() => {
    if (!ctx || !fn) return;
    return ctx.register(fn);
  }, [ctx, fn]);
}

// Helper que tu peux appeler après une tx confirmée
export function useLiveTriggerAll() {
  const ctx = useContext(LiveCtx);
  return ctx?.triggerAll ?? (() => {});
}
