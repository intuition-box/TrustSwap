export default function FlipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ margin: "8px auto", display: "block", borderRadius: 999, padding: "4px 10px", fontSize: 14, background: "rgba(0,0,0,0.2)" }}
      aria-label="Flip tokens"
    >
      ⇅
    </button>
  );
}
