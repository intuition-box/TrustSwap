import { useState } from "react";
import Navbar from "./components/NavBar";
import PoolList from "./components/PoolsList";
import Swap from "./components/Swap";
import Farm from "./components/Farm";
import farms from "./farms/intuition.json";
import WalletTokens from "./components/Connect"; // uniquement affichage des tokens
import "./styles/globals.css";
import RainbowConnectButton from './components/RainbowConnectButton';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, ConnectButton, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiConfig, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { intuitChain } from './chain/intuit';
import { http } from 'viem';

// Wagmi + RainbowKit v2
const config = getDefaultConfig({
  appName: 'Intuition DApp',
  projectId: 'b36d1d48f1d05782328e0176b92fb884',
  chains: [intuitChain],
  transports: {
    [intuitChain.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("swap");
  const { address, isConnected } = useAccount();

  const renderContent = () => {
    switch (activeTab) {
      case "swap":
        return <Swap />;
      case "pools":
        return <PoolList />;
      case "farms":
        return (
          <>
            {farms.map((f) => (
              <Farm
                key={f.stakingRewards}
                stakingRewards={f.stakingRewards as `0x${string}`}
                stakingToken={f.stakingToken as `0x${string}`}
                rewardsToken={f.rewardsToken as `0x${string}`}
              />
            ))}
          </>
        );
      default:
        return <Swap />;
    }
  };

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={darkTheme({})}>
        
          <div className="containerBody">
            <Navbar setActiveTab={setActiveTab} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px" }}>
              {/* ton bouton noir personnalisé */}
            </div>
            <div className="contentContainer">{renderContent()}</div>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
