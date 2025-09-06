// apps/web/src/features/pools/components/liquidity/RemoveLiquidityDrawer.tsx
import { useState } from "react";
import type { Address } from "viem";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";
import styles from "../../pools.module.css";


export function RemoveLiquidityDrawer({ tokenA, tokenB, onClose }:{ tokenA: Address; tokenB: Address; onClose: () => void; }) {
const { removeLiquidity } = useLiquidityActions();
const [lp, setLp] = useState("");
const [deadline, setDeadline] = useState(600);


async function submit() {
await removeLiquidity(tokenA, tokenB, to18(lp), 0n, 0n, /*to*/ (window as any).selectedAddr, Math.floor(Date.now()/1000)+deadline);
onClose();
}


return (
<div className={styles.drawer}>
<h3>Remove Liquidity</h3>
<input value={lp} onChange={e=>setLp(e.target.value)} placeholder="LP amount" />
<button onClick={submit}>Remove</button>
<button onClick={onClose}>Close</button>
</div>
);
}


function to18(x: string): bigint { try { return BigInt(Math.floor(Number(x)*1e18)); } catch { return 0n; } }