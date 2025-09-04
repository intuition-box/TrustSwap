import styles from "@ui/styles/Swap.module.css";

export default function ApproveAndSwap({
  connected, disabled, onClick
}: { connected: boolean; disabled: boolean; onClick: () => Promise<void> }) {
  return (
    <button
      disabled={!connected || disabled}
      onClick={onClick}
      className={styles.swapBtn}
    >
      <span className={styles.textBtnSwap}>{!connected ? "Connect wallet" : "Swap"}</span>
    </button>
  );
}
