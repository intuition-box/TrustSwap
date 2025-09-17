// apps/web/src/features/alerts/Alerts.tsx
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import styles from "@ui/styles/Toast.module.css";
/* ===========================
   Types (inline, pas d’import)
   =========================== */
type AlertSeverity = "info" | "success" | "warning" | "error";
type AlertKind =
  | "generic"
  | "wallet:connect"
  | "network:wrong"
  | "tx:pending"
  | "tx:confirmed"
  | "tx:failed"
  | "approve:pending"
  | "approve:confirmed"
  | "approve:failed"
  | "feature:comingSoon";

type ExplorerLink = { label?: string; url: string };
type CTA = { label: string; onClick: () => void };

type AlertBase = {
  id?: string;
  dedupeKey?: string;
  createdAt?: number;
  sticky?: boolean;
  ttlMs?: number;
  asModal?: boolean;
  severity?: AlertSeverity;
};

type AlertPayloads =
  | (AlertBase & {
      kind: "generic";
      title?: string;
      message: string;
      cta?: CTA[];
    })
  | (AlertBase & {
      kind:
        | "tx:pending"
        | "tx:confirmed"
        | "tx:failed"
        | "approve:pending"
        | "approve:confirmed"
        | "approve:failed";
      txHash?: `0x${string}`;
      chainId?: number;
      message?: string;
      explorer?: ExplorerLink;
      retry?: () => Promise<void> | void;
    })
  | (AlertBase & {
      kind: "wallet:connect" | "network:wrong" | "feature:comingSoon";
      message?: string;
      cta?: CTA[];
    });

type Alert = AlertPayloads & { id: string };

type AlertsState = { list: Alert[] };
type Action =
  | { type: "PUSH"; alert: Alert }
  | { type: "DISMISS"; id: string }
  | { type: "CLEANUP" };

/* ===============
   Id utils (no dep)
   =============== */
function genId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dedupeKeyFor(p: any): string | undefined {
  if ("txHash" in p && p.txHash) return `${p.kind}:${p.txHash}`;
  if ("message" in p && p.message) return `${p.kind}:${p.message}`;
  return undefined;
}

/* ==================
   Event bus minimal
   ================== */
type Handler = (a: AlertPayloads) => void;
const subs = new Set<Handler>();
const AlertsBus = {
  emit: (a: AlertPayloads) => subs.forEach((h) => h(a)),
  on: (h: Handler) => (subs.add(h), () => subs.delete(h)),
};
const DEBUG = true;
/* ================
   Reducer central
   ================ */
function alertsReducer(state: AlertsState, action: Action): AlertsState {
  switch (action.type) {
    case "PUSH": {
      const a = action.alert;

      // Base: si c'est un toast (pas modal), on retire tous les toasts non-sticky existants
      let base = a.asModal ? state.list : state.list.filter((x) => x.asModal || x.sticky);

      // Dédup par clé (txHash / kind+message)
      if (a.dedupeKey) {
        base = base.filter((x) => x.dedupeKey !== a.dedupeKey);
      }

      // Ajoute le nouveau en tête
      const next = [a, ...base];

      // (Sécurité) garde max 1 toast visible en même temps
      const toasts = next.filter((x) => !x.asModal && !x.sticky);
      const modalsAndSticky = next.filter((x) => x.asModal || x.sticky);

      return { list: [...toasts.slice(0, 1), ...modalsAndSticky] };
    }

    case "DISMISS":
      return { list: state.list.filter((a) => a.id !== action.id) };

    case "CLEANUP": {
      const now = Date.now();
      return {
        list: state.list.filter((a) => a.sticky || !a.ttlMs || (a.createdAt ?? 0) + a.ttlMs > now),
      };
    }

    default:
      return state;
  }
}


/* =========================
   Contexte + Provider root
   ========================= */
const AlertsCtx = createContext<{
  alerts: Alert[];
  dismiss: (id: string) => void;
}>({ alerts: [], dismiss: () => {} });

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(alertsReducer, { list: [] });

  useEffect(() => {
    DEBUG && console.log("[Alerts] Provider mounted");

    const off = AlertsBus.on((payload) => {
      DEBUG && console.log("[Alerts] BUS → PAYLOAD", payload);
      const computedDedupe = payload.dedupeKey ?? dedupeKeyFor(payload);
      const alert: Alert = {
        id: payload.id ?? genId(),
        createdAt: Date.now(),
        severity: payload.severity ?? "info",
        ttlMs: payload.asModal ? undefined : payload.ttlMs ?? 6000,
        dedupeKey: computedDedupe,     
        ...payload,
      };
      dispatch({ type: "PUSH", alert });
    });

    const iv = setInterval(() => dispatch({ type: "CLEANUP" }), 1500);
    return () => {
      off();
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    DEBUG && console.log("[Alerts] STATE", state.list);
  }, [state.list]);

  const value = useMemo(
    () => ({
      alerts: state.list,
      dismiss: (id: string) => dispatch({ type: "DISMISS", id }),
    }),
    [state.list]
  );

  return <AlertsCtx.Provider value={value}>{children}</AlertsCtx.Provider>;
}


export function useAlertsContext() {
  return useContext(AlertsCtx);
}

/* =================
   Hook ergonomique
   ================= */
export function useAlerts() {
  function push(a: AlertPayloads) {
    AlertsBus.emit(a);
  }
  return {
    push,
    info: (message: string) => push({ kind: "generic", message, severity: "info" }),
    success: (message: string) => push({ kind: "generic", message, severity: "success" }),
    warn: (message: string) => push({ kind: "generic", message, severity: "warning" }),
    error: (message: string) =>
      push({ kind: "generic", message, severity: "error", asModal: false }),
    txPending: (txHash?: `0x${string}`, chainId?: number, explorer?: string) =>
      push({
        kind: "tx:pending",
        txHash,
        chainId,
        explorer: explorer ? { url: explorer } : undefined,
        severity: "info",
        dedupeKey: txHash,
      }),
    txConfirmed: (txHash?: `0x${string}`, chainId?: number, explorer?: string) =>
      push({
        kind: "tx:confirmed",
        txHash,
        chainId,
        explorer: explorer ? { url: explorer } : undefined,
        severity: "success",
        dedupeKey: txHash,
      }),
    txFailed: (txHash?: `0x${string}`, message?: string, retry?: () => void) =>
      push({
        kind: "tx:failed",
        txHash,
        message,
        severity: "error",
        retry,
        asModal: true,
        sticky: true,
        dedupeKey: txHash || message,
      }),
  };
}

/* =========================
  UI Toaster (non bloquant)
   ========================= */

export function AlertToaster() {
  const { alerts, dismiss } = useAlertsContext();
  const toasts = alerts.filter((a) => !a.asModal);

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 2147483647,
        right: 16,
        bottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((a) => (
        <div
          key={a.id}
          className={styles.toastContainer}
        >
          <div className={styles.haloToast}></div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {a.kind.startsWith("tx:") ? a.kind.replace("tx:", "Tx ") : a.severity}
          </div>

          {"message" in a && a.message && (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>{a.message}</div>
          )}

          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            {"explorer" in a && a.explorer?.url && (
              <a
                href={a.explorer.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, textDecoration: "underline", color: "#cfe3ff" }}
              >
                View on explorer
              </a>
            )}
            <button
              onClick={() => dismiss(a.id)}
              className={styles.closeToastBtn}
            >
              X
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}



/* ==========================
   UI Modales (bloquantes)
   ========================== */
export function AlertModalHost() {
  const { alerts, dismiss } = useAlertsContext();
  const modals = alerts.filter((a) => a.asModal);

  return (
    <>
      {modals.map((a) => (
        <div
          key={a.id}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "red",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 16,
              background: "#111",
              color: "#fff",
              padding: 20,
              boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              {a.kind === "tx:failed"
                ? "Transaction failed"
                : a.kind === "network:wrong"
                ? "Wrong network"
                : a.kind === "feature:comingSoon"
                ? "Coming soon"
                : "Information"}
            </div>

            {"message" in a && a.message && (
              <p style={{ fontSize: 14, opacity: 0.9 }}>{a.message}</p>
            )}

            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {"retry" in a && a.retry && (
                <button
                  onClick={() => a.retry?.()}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "red",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              )}
              {"explorer" in a && a.explorer?.url && (
                <a
                  href={a.explorer.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  View on explorer
                </a>
              )}
              <button
                onClick={() => dismiss(a.id)}
                style={{
                  marginLeft: "auto",
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}


/* =================================
   Helper pour writeContract (facult.)
   ================================= */
export function useTxAlerts() {
  const alerts = useAlerts();
  return {
    onSubmit(txHash?: `0x${string}`, explorerUrl?: string, chainId?: number) {
      alerts.txPending(txHash, chainId, explorerUrl);
    },
    onSuccess(txHash?: `0x${string}`, explorerUrl?: string, chainId?: number) {
      alerts.txConfirmed(txHash, chainId, explorerUrl);
    },
    onError(txHash?: `0x${string}`, message?: string, retry?: () => void) {
      alerts.txFailed(txHash, message, retry);
    },
  };
}
