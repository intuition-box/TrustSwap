import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { INTUITION } from "@trustswap/sdk";
import { BrowserRouter } from "react-router-dom";
import type { Chain } from "viem/chains"; // <- type util

import App from "./App";

const chainId = Number(import.meta.env.VITE_CHAIN_ID);
const rpc = String(import.meta.env.VITE_RPC);

// ⚠️ INTUITION est readonly: on crée une variante "patchée"
const chain = {
  ...INTUITION,
  id: chainId,
  rpcUrls: {
    // viem aime bien avoir "default" et "public"
    default: { http: [rpc] },
    public: { http: [rpc] },
  },
} satisfies Chain;

const config = createConfig({
  chains: [chain],
  transports: { [chain.id]: http(rpc) },
});

const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WagmiProvider config={config}>
        <QueryClientProvider client={qc}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </BrowserRouter>
  </React.StrictMode>
);
