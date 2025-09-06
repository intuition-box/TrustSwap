import { useState } from "react";
import type { Address } from "viem";
import { AddLiquidityDrawer } from "./AddLiquidityDrawer";
import { RemoveLiquidityDrawer } from "./RemoveLiquidityDrawer";

export function LiquidityModal({
  tokenA,
  tokenB,
  onClose,
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"add" | "remove">("add");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "90vw",
          background: "#111",
          border: "1px solid #222",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong>Liquidity</strong>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setTab("add")} style={{ borderBottom: tab === "add" ? "2px solid #fff" : "2px solid transparent" }}>Add</button>
          <button onClick={() => setTab("remove")} style={{ borderBottom: tab === "remove" ? "2px solid #fff" : "2px solid transparent" }}>Remove</button>
        </div>

        {tab === "add" ? (
          <AddLiquidityDrawer tokenA={tokenA} tokenB={tokenB} onClose={onClose} />
        ) : (
          <RemoveLiquidityDrawer tokenA={tokenA} tokenB={tokenB} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
