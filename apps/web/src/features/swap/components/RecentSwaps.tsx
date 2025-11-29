import styles from "@ui/styles/Swap.module.css";
import { useSwapContext } from "../SwapContext";
import { formatUnits } from "viem";
import { usePairAddress } from "../hooks/usePairAddress";
import { useRecentSwapsForPair } from "../hooks/useRecentSwapsForPair";

function shortenAddress(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortenHash(hash: string) {
  if (!hash) return "";
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function getExplorerTxUrl(chainIdStr: string, txHash: string) {
  const chainId = Number(chainIdStr);
  if (!txHash) return "#";

  switch (chainId) {
    case 1155:
      return `https://explorer.intuition.systems/tx/${txHash}`;
    case 13579:
      return `https://testnet.explorer.intuition.systems/tx/${txHash}`;
    default:
      return "#";
  }
}

function formatAmount(raw: string, decimals: number) {
  try {
    const bn = BigInt(raw);
    const num = Number(formatUnits(bn, decimals));
    if (!Number.isFinite(num)) return raw;
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  } catch {
    return raw;
  }
}

export function RecentSwaps() {
  const { pairAddress } = useSwapContext();
  const { data, isLoading } = useRecentSwapsForPair(pairAddress);

  return (
    <div className={styles.recentSwapsRoot}>
      <div className={styles.recentSwapsHeader}>
        <h2 className={styles.recentSwapsTitle}>Recent activity</h2>
      </div>

      <div className={styles.recentSwapsTableWrapper}>
        <table className={styles.recentSwapsTable}>
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Type</th>
              <th>In</th>
              <th>Out</th>
              <th>Trader</th>
              <th>Txn</th>
            </tr>
          </thead>
          <tbody>
            {!pairAddress && !isLoading && (
              <tr>
                <td colSpan={6}>Select a pair to see the latest trades.</td>
              </tr>
            )}

            {isLoading && (
              <tr>
                <td colSpan={6}>Loading swaps...</td>
              </tr>
            )}

            {!isLoading &&
              pairAddress &&
              data.map((swap) => {
                const formattedIn = formatAmount(
                  swap.amountInRaw,
                  swap.inDecimals,
                );
                const formattedOut = formatAmount(
                  swap.amountOutRaw,
                  swap.outDecimals,
                );
                const txUrl = getExplorerTxUrl(swap.chainId, swap.txHash);

                return (
                  <tr key={swap.id}>
                    <td>{swap.timeLabel}</td>
                    <td
                      className={
                        swap.side === "buy"
                          ? styles.swapSideBuy
                          : styles.swapSideSell
                      }
                    >
                      {swap.side === "buy" ? "Buy" : "Sell"}
                    </td>
                    <td>
                      {formattedIn} {swap.inSymbol}
                    </td>
                    <td>
                      {formattedOut} {swap.outSymbol}
                    </td>
                    <td>{shortenAddress(swap.wallet)}</td>
                    <td>
                      {txUrl === "#" ? (
                        shortenHash(swap.txHash)
                      ) : (
                        <a
                          href={txUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.txLink}
                        >
                          {shortenHash(swap.txHash)}
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}