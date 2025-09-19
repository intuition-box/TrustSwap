// features/pools/components/StakeClaimCell.tsx
import { useEffect, useMemo, useState } from "react";
import type { PoolItem } from "../../types";
import { useStakeActions } from "../../hooks/useStakeActions";
import { useAccount, usePublicClient } from "wagmi";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import styles from "../../pools.module.css";

const LP_DECIMALS = 18; // Uniswap V2 LP tokens sont en 18 décimales

export function StakeClaimCellContent({
  pool,
  loading = false,
}: {
  pool: PoolItem;
  loading?: boolean;
}) {
  const [stakeAmt, setStakeAmt] = useState("");
  const [unstakeAmt, setUnstakeAmt] = useState("");

  const stakingAddr = (pool.staking || undefined) as any;
  const { stake, withdraw } = useStakeActions(stakingAddr);

  const stakedLpBn = pool.stakedBalance ?? 0n;


  const walletLpBn = useWalletLpFallback(pool.walletLpBalance, pool.pair);

  const walletLpStr = useMemo(
    () => safeFormat(walletLpBn, LP_DECIMALS),
    [walletLpBn]
  );
  const stakedLpStr = useMemo(
    () => safeFormat(stakedLpBn, LP_DECIMALS),
    [stakedLpBn]
  );

  if (loading) return <div className={styles.skeletonLine}></div>;

  return (
    <div className={styles.stakeCell}>
      {/* Stake */}
      <div className={styles.stakeRow}>
        <span className={styles.labelStakePopup}>
          Stake LP
          <div
            className={styles.lpStake}
            onClick={(e) => {
              e.stopPropagation();
              setStakeAmt(walletLpStr); // MAX
            }}
            style={{ cursor: "pointer" }}
            title="Click to use full balance"
          >
            Balance: {walletLpStr}
          </div>
        </span>

        <div className={styles.containerStake}>
          <input
            className={styles.amountInputStake}
            value={stakeAmt}
            onChange={(e) => setStakeAmt(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Amount to Stake"
            inputMode="decimal"
          />
          <button
            className={styles.btnAction}
            onClick={(e) => {
              e.stopPropagation();
              const v = parseUnitsSafe(stakeAmt, LP_DECIMALS);
              if (v > 0n) stake?.(v);
              setStakeAmt("");
            }}
            disabled={!pool.staking}
          >
            Stake
          </button>
        </div>
      </div>

      <div className={styles.ligne}></div>

      {/* Unstake */}
      <div className={styles.stakeRow}>
        <span className={styles.labelStakePopup}>
          Unstake LP
          <div
            className={styles.lpStake}
            onClick={(e) => {
              e.stopPropagation();
              setUnstakeAmt(stakedLpStr); // MAX
            }}
            style={{ cursor: "pointer" }}
            title="Click to use full balance"
          >
            Balance: {stakedLpStr}
          </div>
        </span>

        <div className={styles.containerUnstake}>
          <input
            className={styles.amountInputUnstake}
            value={unstakeAmt}
            onChange={(e) => setUnstakeAmt(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Amount to Unstake"
            inputMode="decimal"
          />
          <button
            className={styles.btnAction}
            onClick={(e) => {
              e.stopPropagation();
              const v = parseUnitsSafe(unstakeAmt, LP_DECIMALS);
              if (v > 0n) withdraw?.(v);
              setUnstakeAmt("");
            }}
            disabled={!pool.staking}
          >
            Unstake
          </button>
        </div>
      </div>
    </div>
  );
}

export function StakeClaimCell(props: { pool: PoolItem; loading?: boolean }) {
  return (
    <td>
      <StakeClaimCellContent {...props} />
    </td>
  );
}

/* ---------------- helpers ---------------- */

function safeFormat(v: bigint, decimals: number): string {
  try {
    return Number(formatUnits(v, decimals)).toFixed(6);
  } catch {
    return "0.000000";
  }
}

function parseUnitsSafe(v: string, decimals: number): bigint {
  try {
    if (!v || !isFinite(Number(v))) return 0n;
    return parseUnits(v as `${number}`, decimals);
  } catch {
    return 0n;
  }
}


function useWalletLpFallback(
  preloaded?: bigint,
  pairAddr?: `0x${string}`
): bigint {
  const { address } = useAccount();
  const pc = usePublicClient();
  const [bal, setBal] = useState<bigint>(preloaded ?? 0n);

  useEffect(() => {
    setBal(preloaded ?? 0n);
  }, [preloaded]);

  useEffect(() => {
    if (!pc || !address || !pairAddr) return;
    if (preloaded != null) return; 

    let cancelled = false;
    (async () => {
      try {
        const b = (await pc.readContract({
          address: pairAddr,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        })) as bigint;
        if (!cancelled) setBal(b);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pc, address, pairAddr, preloaded]);

  return bal;
}
