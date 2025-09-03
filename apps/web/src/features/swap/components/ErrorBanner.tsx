export default function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div style={{ padding: 8, borderRadius: 8, background: "rgba(220, 38, 38, 0.15)", color: "#ef4444", fontSize: 13 }}>
      {message}
    </div>
  );
}
