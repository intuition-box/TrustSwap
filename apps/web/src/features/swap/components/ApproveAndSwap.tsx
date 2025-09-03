export default function ApproveAndSwap({
  connected, disabled, onClick
}: { connected: boolean; disabled: boolean; onClick: () => Promise<void> }) {
  return (
    <button
      disabled={!connected || disabled}
      onClick={onClick}
      style={{
        width: "100%", borderRadius: 12, padding: "12px 16px",
        fontWeight: 700, color: "white",
        background: (!connected || disabled) ? "#666" : "#4f46e5",
        cursor: (!connected || disabled) ? "not-allowed" : "pointer",
      }}
    >
      {!connected ? "Connect wallet" : "Swap"}
    </button>
  );
}
