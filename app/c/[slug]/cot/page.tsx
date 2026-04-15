export default function CotPage() {
  return (
    <>
      <header className="view-header">
        <span className="view-title">CỐT</span>
        <span className="view-subtitle">Các bài viết cốt lõi, đỉnh cao từ cộng đồng</span>
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
          <div style={{ fontSize: 40, marginBottom: 8 }}>⭐</div>
          <div style={{ color: "var(--text-heading)", fontWeight: 700, marginBottom: 4 }}>
            CỐT — Top quality posts
          </div>
          Module đang hoàn thiện. Các bài CỐT sẽ xuất hiện ở đây khi admin đánh dấu từ Bảng tin.
        </div>
      </div>
    </>
  );
}
