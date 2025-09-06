// apps/web/src/features/pools/components/liquidity/AddLiquidityDrawer.tsx
import { useState } from "react";
import type { Address } from "viem";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";
import styles from "../../pools.module.css";


export function AddLiquidityDrawer({ tokenA, tokenB, onClose }:{ tokenA: Address; tokenB: Address; onClose: () => void; }) {
const { addLiquidity } = useLiquidityActions();
const [a, setA] = useState("");
const [b, setB] = useState("");
const [deadline, setDeadline] = useState(600);


async function submit() {
await addLiquidity(tokenA, tokenB, to18(a), to18(b), 0n, 0n, /*to*/ (window as any).selectedAddr, Math.floor(Date.now()/1000)+deadline);
onClose();
}


return (
<div className={styles.drawer}>
<h3>Add Liquidity</h3>
<input value={a} onChange={e=>setA(e.target.value)} placeholder="Amount A" />
<input value={b} onChange={e=>setB(e.target.value)} placeholder="Amount B" />
<button onClick={submit}>Supply</button>
<button onClick={onClose}>Close</button>
</div>
);
}


function to18(x: string): bigint { try { return BigInt(Math.floor(Number(x)*1e18)); } catch { return 0n; } }