import { PrivyProvider } from '@privy-io/react-auth';
import { INTUITION } from '@trustswap/sdk';

export default function PrivyRoot({ children }: { children: React.ReactNode }) {
  const rpc = String(import.meta.env.VITE_RPC);

  const chain = {
    ...INTUITION,
    rpcUrl: rpc,
  };

  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google', 'apple', 'wallet'],
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
        defaultChain: chain,
        supportedChains: [chain],
        appearance: { theme: 'dark' },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
