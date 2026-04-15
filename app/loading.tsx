export default function Loading() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid var(--bg-elevated)",
            borderTopColor: "var(--brand-green)",
            animation: "ui-spin 0.8s linear infinite",
          }}
        />
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Đang tải…
        </div>
      </div>
      <style>{`
        @keyframes ui-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
