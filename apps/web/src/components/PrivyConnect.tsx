// apps/web/src/components/PrivyConnect.tsx
import { usePrivy, useWallets } from '@privy-io/react-auth';

export default function PrivyConnect() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) return null;

  if (!authenticated) {
    return <button onClick={login}>Connect</button>;
  }

  const primary =
    wallets.find(w => w.walletClientType === 'privy') ??
    wallets[0];

  const addr = primary?.address
    ?? user?.wallet?.address
    ?? user?.linkedAccounts?.find(a => (a as any).address)?.address;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span>{addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : 'Signed in'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}