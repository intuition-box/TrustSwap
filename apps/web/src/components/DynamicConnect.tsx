// src/components/DynamicConnect.tsx
import { useEffect } from "react";
import { useDisconnect as useWagmiDisconnect } from "wagmi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAlerts } from "../features/alerts/Alerts";

import styles from "../styles/Layout.module.css";

export default function DynamicConnect() {
  const {
    sdkHasLoaded,
    setShowAuthFlow,
    handleLogOut,
    primaryWallet,
    user,
  } = useDynamicContext();

  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();
  const alerts = useAlerts();

  useEffect(() => {
    if (user) {
      alerts.success("Wallet connected ✅");
    }
  }, [user]);

  if (!sdkHasLoaded) return null;

  async function disconnectEverywhere() {
    // Only disconnect if the connector has a disconnect method
    if (primaryWallet?.connector && typeof (primaryWallet.connector as any).disconnect === "function") {
      try { await (primaryWallet.connector as any).disconnect(); } catch {}
    }
    try { wagmiDisconnect(); } catch {}
    try { await handleLogOut(); } catch {}
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("wc@2") || k.includes("walletconnect"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}

    alerts.info("Wallet disconnected");
  }

  if (!user) {
    return (
      <button
        onClick={() => setShowAuthFlow(true)}
        className={styles.connectWalletBtn}
      >
        <span className={styles.gradientText}>Connect Wallet</span>
      </button>
    );
  }

  return (
    <div>
      <button onClick={disconnectEverywhere} className={styles.connectWalletBtn}>
        <span className={styles.gradientText}>Disconnect</span>
      </button>
    </div>
  );
}
