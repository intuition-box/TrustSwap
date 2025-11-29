import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import SwapPage from "./pages/SwapPage";
import SwapProPage from "./pages/SwapProPage";
import PoolsPage from "./pages/PoolsPage";
import PortfolioPage from "./pages/PortfolioPage";
import NotFound from "./pages/NotFound";
import Landing from "./Landing";

import { SwapProvider } from "./features/swap/SwapContext";
import './styles/App.css';

export default function App() {

  return (
    <SwapProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Landing />} />
          <Route path="/swap" element={<SwapPage />} />
          <Route path="/swap/pro" element={<SwapProPage />} />
          <Route path="/pools" element={<PoolsPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SwapProvider>
  );
}
