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
  return (
    <DynamicContextProvider
      settings={{
        environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [EthereumWalletConnectors],
        overrides: { evmNetworks: [toDynamicEvmNetwork()] },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            {children}
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  )
}
