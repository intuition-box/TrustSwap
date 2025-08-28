import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/NavBar";
import PoolList from "./components/PoolsList";
import Swap from "./components/Swap";
import Farm from "./components/Farm";
import farms from "./farms/intuition.json";
import WalletTokens from "./components/WalletTokens"; // uniquement affichage des tokens
import "./styles/globals.css";

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiConfig, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { intuitChain } from './chain/intuit';
import { http } from 'viem';

type TabKey = "swap" | "pools" | "farms" | "profile";

function getInitialTab(): TabKey {
  if (typeof window !== "undefined") {
    const fromHash = (window.location.hash || "").replace(/^#/, "") as TabKey;
    if (fromHash === "swap" || fromHash === "pools" || fromHash === "farms" || fromHash === "profile") {
      return fromHash;
    }
    const fromLS = localStorage.getItem("lastTab") as TabKey | null;
    if (fromLS === "swap" || fromLS === "pools" || fromLS === "farms" || fromLS === "profile") {
      return fromLS;
    }
  }
  return "swap";
}

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
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab());
  const { address } = useAccount();

    // met à jour l’URL + localStorage quand l’onglet change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== `#${activeTab}`) {
      window.location.hash = `#${activeTab}`;
    }
    localStorage.setItem("lastTab", activeTab);
  }, [activeTab]);

  // gère back/forward du navigateur
  useEffect(() => {
    const onHashChange = () => {
      const h = (window.location.hash || "").replace(/^#/, "") as TabKey;
      if (h && h !== activeTab) {
        setActiveTab(h);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [activeTab]);

  // passe une fonction de navigation au Navbar pour qu’il mette aussi le hash
  const navigate = (tab: TabKey) => setActiveTab(tab);

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
      case "profile":
        return <WalletTokens address={address as `0x${string}`} />;
      default:
        return <Swap />;
    }
  };

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({})}>
          <div className="containerBody">
            <Navbar setActiveTab={navigate} activeTab={activeTab} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px" }} />
            <div className="contentContainer">{renderContent()}</div>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
