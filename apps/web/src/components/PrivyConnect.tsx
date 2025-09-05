import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useDisconnect as useWagmiDisconnect } from 'wagmi';
import styles from "../styles/Layout.module.css";

export default function PrivyConnect() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();

  if (!ready) return null;

  const primary =
    wallets.find(w => w.walletClientType === 'privy') ?? wallets[0];

  const addr =
    primary?.address ??
    user?.wallet?.address ??
    user?.linkedAccounts?.find(a => (a as any).address)?.address;

  async function disconnectEverywhere() {
    for (const w of wallets) {
      try { await (w as any)?.disconnect?.(); } catch {}
    }

    try { wagmiDisconnect(); } catch {}

    await logout();
    
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('wc@2') || k.includes('walletconnect'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  if (!authenticated) {
    return <button onClick={login} className={styles.connectWalletBtn}>
      <span className={styles.gradientText}>Connect Wallet</span>
    </button>;
  }

  return (
    <div>
      <button onClick={disconnectEverywhere} className={styles.connectWalletBtn}>
      <span className={styles.gradientText}>Disconnect</span>

      </button>
    </div>
  );
}
