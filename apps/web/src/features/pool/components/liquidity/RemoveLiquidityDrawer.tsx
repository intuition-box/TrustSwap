import { useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";

export function RemoveLiquidityDrawer({
  tokenA,
  tokenB,
  onClose,
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
}) {
  const { address: to } = useAccount();
  const { removeLiquidity } = useLiquidityActions();
  const [lpAmount, setLpAmount] = useState("");
  const [deadlineSec, setDeadlineSec] = useState(600);

  async function onSubmit() {
    if (!tokenA || !tokenB || !to) return;
    await removeLiquidity(
      tokenA,
      tokenB,
      parseUnits(lpAmount || "0", 18),
      0n,
      0n,
      to,
      Math.floor(Date.now() / 1000) + Number(deadlineSec)
    );
    onClose();
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>Pair: <code>{tokenA}</code> / <code>{tokenB}</code></div>
      <input placeholder="LP Amount" value={lpAmount} onChange={(e) => setLpAmount(e.target.value)} />
      <input
        placeholder="Deadline (sec)"
        type="number"
        value={deadlineSec}
        onChange={(e) => setDeadlineSec(Number(e.target.value))}
      />
      <button onClick={onSubmit}>Remove</button>
    </div>
  );
}
