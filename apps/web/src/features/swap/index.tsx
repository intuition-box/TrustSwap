import SwapForm from "./components/SwapForm";

export default function SwapPage() {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <SwapForm />
      </div>
    </div>
  );
}