export default function Loading() {
  return (
    <>
      <header className="view-header">
        <span className="view-title" style={{ opacity: 0.5 }}>Đang tải sản phẩm…</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-8)" }}>
        <div style={{ maxWidth: 760 }}>
          <div
            className="ui-card ui-card-lg"
            style={{
              display: "flex",
              gap: "var(--space-5)",
              alignItems: "center",
              marginBottom: "var(--space-5)",
            }}
          >
            <div aria-hidden className="ui-skeleton" style={{ width: 120, height: 120, borderRadius: "var(--r-lg)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div aria-hidden className="ui-skeleton" style={{ height: 28, width: "80%", borderRadius: 6, marginBottom: "var(--space-2)" }} />
              <div aria-hidden className="ui-skeleton" style={{ height: 14, width: 120, borderRadius: 4, marginBottom: "var(--space-3)" }} />
              <div aria-hidden className="ui-skeleton" style={{ height: 32, width: 180, borderRadius: 6 }} />
            </div>
          </div>
          <div aria-hidden className="ui-skeleton" style={{ height: 100, borderRadius: 12, marginBottom: "var(--space-5)" }} />
          <div aria-hidden className="ui-skeleton" style={{ height: 60, borderRadius: 12 }} />
        </div>
      </div>
    </>
  );
}
