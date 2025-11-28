import styles from "@ui/styles/Swap.module.css";

type RecentSwap = {
  id: string;
  time: string;
  pair: string;
  side: "buy" | "sell";
  amountIn: string;
  tokenIn: string;
  amountOut: string;
  tokenOut: string;
  wallet: string;
};

const MOCK_SWAPS: RecentSwap[] = [
  {
    id: "1",
    time: "2m ago",
    pair: "TRUST / USDT",
    side: "buy",
    amountIn: "1,200",
    tokenIn: "USDT",
    amountOut: "35.2",
    tokenOut: "TRUST",
    wallet: "0xAb...91f3",
  },
  {
    id: "2",
    time: "5m ago",
    pair: "TSWP / USDT",
    side: "sell",
    amountIn: "120",
    tokenIn: "TSWP",
    amountOut: "400",
    tokenOut: "USDT",
    wallet: "0x9d...e21c",
  },
];

export function RecentSwaps() {
  const data = MOCK_SWAPS;

  return (
    <div className={styles.recentSwapsRoot}>
      <div className={styles.recentSwapsHeader}>
        <h2 className={styles.recentSwapsTitle}>Recent transactions</h2>
      </div>

      <div className={styles.recentSwapsTableWrapper}>
        <table className={styles.recentSwapsTable}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Pair</th>
              <th>Side</th>
              <th>From</th>
              <th>To</th>
              <th>Wallet</th>
            </tr>
          </thead>
          <tbody>
            {data.map((swap) => (
              <tr key={swap.id}>
                <td>{swap.time}</td>
                <td>{swap.pair}</td>
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
                  {swap.amountIn} {swap.tokenIn}
                </td>
                <td>
                  {swap.amountOut} {swap.tokenOut}
                </td>
                <td>{swap.wallet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
