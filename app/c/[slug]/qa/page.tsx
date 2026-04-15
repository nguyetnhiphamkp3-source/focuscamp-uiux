export default function QAPage() {
  return (
    <>
      <header className="view-header">
        <span className="view-title">Hỏi đáp</span>
        <span className="view-subtitle">Đặt câu hỏi, nhận câu trả lời từ cộng đồng + AI</span>
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
          <div style={{ fontSize: 40, marginBottom: 8 }}>❓</div>
          <div style={{ color: "var(--text-heading)", fontWeight: 700, marginBottom: 4 }}>
            Hỏi đáp
          </div>
          Module đang hoàn thiện. Sẽ sớm cho phép post câu hỏi + AI Agent trả lời tự động.
        </div>
      </div>
    </>
  );
}
