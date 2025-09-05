import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useDisconnect as useWagmiDisconnect } from 'wagmi';

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
    return <button onClick={login}>Connect Wallet</button>;
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span>{addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : 'Signed in'}</span>
      <button onClick={disconnectEverywhere}>Disconnect</button>
    </div>
  );
}
