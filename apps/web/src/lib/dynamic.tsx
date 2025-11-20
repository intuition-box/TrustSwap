import type { PropsWithChildren } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { wagmiConfig } from "./wagmi";
import { intuitionTestnet, intuitionMainnet } from "@trustswap/sdk";

const queryClient = new QueryClient();

function toDynamicEvmNetwork(chain: typeof intuitionTestnet | typeof intuitionMainnet, opts: { testnet: boolean }) {
  return {
    chainId: chain.id,
    networkId: chain.id,
    name: chain.name,
    vanityName: "Intuition",
    shortName: "intuition",
    chainName: chain.name,
    rpcUrls: chain.rpcUrls.default.http.slice(),
    blockExplorerUrls: [chain.blockExplorers?.default?.url].filter(Boolean) as string[],
    nativeCurrency: chain.nativeCurrency,
    testnet: opts.testnet,
    iconUrls: [],
  };
}

const dynamicEvmNetworks = [
  toDynamicEvmNetwork(intuitionTestnet, { testnet: true }),
  toDynamicEvmNetwork(intuitionMainnet, { testnet: false }),
];

export function RootProviders({ children }: PropsWithChildren) {
  const envId =
    (import.meta.env.VITE_DYNAMIC_ENV_ID as string | undefined) ??
    "78601171-b1f9-42d1-b651-b76f97becab7";

  if (!envId) {
    console.error("Missing Dynamic environmentId");
    return (
      <div style={{ padding: 16 }}>
        Wallet connect disabled: missing Dynamic environmentId.
      </div>
    );
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: envId,
        walletConnectors: [EthereumWalletConnectors],
        overrides: { evmNetworks: dynamicEvmNetworks },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
