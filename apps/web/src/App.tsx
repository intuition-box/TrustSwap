import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import SwapPage from "./pages/SwapPage";
import PoolsPage from "./pages/PoolsPage";
import PortfolioPage from "./pages/PortfolioPage";
import NotFound from "./pages/NotFound";
import Landing from "./Landing"; // ta landing

import './styles/App.css';

export default function App() {

  return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/swap" element={<SwapPage />} />
          <Route path="/pools" element={<PoolsPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

  );
}
