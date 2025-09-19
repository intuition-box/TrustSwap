// features/pools/components/StakeClaimCell.tsx
import { useEffect, useMemo, useState } from "react";
import type { PoolItem } from "../../types";
import { useStakeActions } from "../../hooks/useStakeActions";
import { useAccount, usePublicClient } from "wagmi";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import styles from "../../pools.module.css";

const LP_DECIMALS = 18;   // LP tokens = 18
const UI_DECIMALS = 6;    // affichage/saisie UI

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

  // ⬇️ format “floor” (pas de Number/toFixed)
  const walletLpStr = useMemo(
    () => formatUnitsFloor(walletLpBn, LP_DECIMALS, UI_DECIMALS),
    [walletLpBn]
  );
  const stakedLpStr = useMemo(
    () => formatUnitsFloor(stakedLpBn, LP_DECIMALS, UI_DECIMALS),
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
              // MAX = string tronquée (≤ balance)
              setStakeAmt(walletLpStr);
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
            onChange={(e) => setStakeAmt(clampInputDecimals(e.target.value, UI_DECIMALS))}
            onClick={(e) => e.stopPropagation()}
            placeholder={"0." + "0".repeat(UI_DECIMALS)}
            inputMode="decimal"
          />
          <button
            className={styles.btnAction}
            onClick={(e) => {
              e.stopPropagation();
              const v = parseUnitsSafe(stakeAmt, LP_DECIMALS);
              // ⬇️ sécurité contract: ne jamais dépasser la balance
              const send = v > walletLpBn ? walletLpBn : v;
              if (send > 0n) stake?.(send);
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
            onChange={(e) => setUnstakeAmt(clampInputDecimals(e.target.value, UI_DECIMALS))}
            onClick={(e) => e.stopPropagation()}
            placeholder={"0." + "0".repeat(UI_DECIMALS)}
            inputMode="decimal"
          />
          <button
            className={styles.btnAction}
            onClick={(e) => {
              e.stopPropagation();
              const v = parseUnitsSafe(unstakeAmt, LP_DECIMALS);
              const send = v > stakedLpBn ? stakedLpBn : v;
              if (send > 0n) withdraw?.(send);
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

// Tronque sans arrondir (floor) à uiDecimals — jamais au-dessus de v
function formatUnitsFloor(v: bigint, decimals: number, uiDecimals: number): string {
  try {
    const s = formatUnits(v, decimals); // ex "123.456789..."
    const dot = s.indexOf(".");
    if (dot === -1) return s;
    const int = s.slice(0, dot);
    const frac = s.slice(dot + 1);
    const fracCut = frac.slice(0, uiDecimals);
    return fracCut.length ? `${int}.${fracCut}` : int;
  } catch {
    return "0";
  }
}

// Limite le nombre de décimales saisies par l’utilisateur
function clampInputDecimals(v: string, uiDecimals: number): string {
  if (!v) return "";
  // keep only first dot, digits only, no leading zeros issues
  const cleaned = v.replace(/[^\d.]/g, "").replace(/^(\.)+/, "0.");
  const parts = cleaned.split(".");
  if (parts.length === 1) return parts[0].replace(/^0+(\d)/, "$1"); // no trailing zeros logic
  const head = parts[0] || "0";
  const tail = parts.slice(1).join(""); // if user typed multiple dots
  return `${head}.${tail.slice(0, uiDecimals)}`;
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
