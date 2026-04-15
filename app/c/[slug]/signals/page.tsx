export default function SignalsPage() {
  return (
    <>
      <header className="view-header">
        <span className="view-title">Tín hiệu</span>
        <span className="view-subtitle">Insight nhanh, trend, cơ hội mới từ cộng đồng</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 24px" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
          <div style={{ color: "var(--text-heading)", fontWeight: 700, marginBottom: 4 }}>
            Tín hiệu — Market pulse
          </div>
          Module đang hoàn thiện. AI Agent sẽ tổng hợp tín hiệu mới mỗi ngày ở đây.
        </div>
      </div>
    </>
  );
}
