// src/components/AlertsFab.tsx
import { useAlerts } from "../features/alerts/Alerts";

export default function AlertsFab() {
  const a = useAlerts();

  function handleClick() {
    console.log("[AlertsFab] click détecté ✅");
    a.success("Hello from FAB 🎉");
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: "fixed",
        zIndex: 9999,
        bottom: 16,
        left: 16,
        padding: "10px 14px",
        borderRadius: 12,
        background: "#111",
        color: "#fff",
        border: "1px solid #333",
      }}
    >
      Test Toast
    </button>
  );
}
