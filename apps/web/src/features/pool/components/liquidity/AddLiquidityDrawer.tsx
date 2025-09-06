import { useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";

export function AddLiquidityDrawer({
  tokenA,
  tokenB,
  onClose,
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
}) {
  const { address: to } = useAccount();
  const { addLiquidity } = useLiquidityActions();
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [deadlineSec, setDeadlineSec] = useState(600);

  async function onSubmit() {
    if (!tokenA || !tokenB || !to) return;
    await addLiquidity(
      tokenA,
      tokenB,
      parseUnits(amountA || "0", 18),
      parseUnits(amountB || "0", 18),
      0n,
      0n,
      to,
      Math.floor(Date.now() / 1000) + Number(deadlineSec)
    );
    onClose();
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>Token A: <code>{tokenA}</code></div>
      <input placeholder="Amount A" value={amountA} onChange={(e) => setAmountA(e.target.value)} />
      <div>Token B: <code>{tokenB}</code></div>
      <input placeholder="Amount B" value={amountB} onChange={(e) => setAmountB(e.target.value)} />
      <input
        placeholder="Deadline (sec)"
        type="number"
        value={deadlineSec}
        onChange={(e) => setDeadlineSec(Number(e.target.value))}
      />
      <button onClick={onSubmit}>Supply</button>
    </div>
  );
}
