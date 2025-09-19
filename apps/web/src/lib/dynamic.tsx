import type { PropsWithChildren } from "react"
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum"
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { wagmiConfig } from "./wagmi"
import { INTUITION } from "@trustswap/sdk"

const queryClient = new QueryClient()

function toDynamicEvmNetwork() {
  return {
    chainId: INTUITION.id,
    networkId: INTUITION.id,
    name: INTUITION.name,
    vanityName: "Intuition",
    shortName: "intuition",
    chainName: INTUITION.name,
    rpcUrls: INTUITION.rpcUrls.default.http.slice(),
    blockExplorerUrls: [INTUITION.blockExplorers?.default?.url].filter(Boolean) as string[],
    nativeCurrency: INTUITION.nativeCurrency,
    testnet: true,
    iconUrls: [],
  }
}

export function RootProviders({ children }: PropsWithChildren) {
  // Prefer env var, fallback to hard-coded id
  const envId = (import.meta.env.VITE_DYNAMIC_ENV_ID as string | undefined) ?? "78601171-b1f9-42d1-b651-b76f97becab7"

  if (!envId) {
    console.error("Missing Dynamic environmentId")
    return <div style={{ padding: 16 }}>Wallet connect disabled: missing Dynamic environmentId.</div>
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: envId,
        walletConnectors: [EthereumWalletConnectors],
        overrides: { evmNetworks: [toDynamicEvmNetwork()] },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  )
}
