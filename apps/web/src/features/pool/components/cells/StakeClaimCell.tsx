// apps/web/src/features/pools/components/cells/StakeClaimCell.tsx
import { useState } from "react";
import type { PoolItem } from "../../types";
import { useStakeActions } from "../../hooks/useStakeActions";
import styles from "../../pools.module.css";


export function StakeClaimCell({ pool }: { pool: PoolItem }) {
const [amt, setAmt] = useState("");
const { stake, withdraw, claim } = useStakeActions(pool.staking || undefined);


return (
<td>
<div className={styles.stakeCell}>
<input
className={styles.amountInput}
value={amt}
onChange={(e) => setAmt(e.target.value)}
placeholder="Amount LP"
/>
<button className={styles.btn} onClick={() => stake?.(parseUnitsSafe(amt))} disabled={!pool.staking}>
Stake
</button>
<button className={styles.btn} onClick={() => withdraw?.(parseUnitsSafe(amt))} disabled={!pool.staking}>
Unstake
</button>
<button className={styles.btnGhost} onClick={() => claim?.()} disabled={!pool.staking}>
Claim
</button>
</div>
</td>
);
}


function parseUnitsSafe(v: string): bigint {
try { return BigInt(Math.floor(Number(v) * 1e18)); } catch { return 0n; }
}