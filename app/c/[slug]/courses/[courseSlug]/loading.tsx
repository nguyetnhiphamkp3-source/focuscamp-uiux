export default function Loading() {
  return (
    <>
      <header className="view-header">
        <span className="view-title" style={{ opacity: 0.5 }}>Đang tải khoá học…</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "var(--space-6) var(--space-8) var(--space-10)",
          }}
        >
          <div aria-hidden className="ui-skeleton" style={{ aspectRatio: "16 / 9", borderRadius: "var(--r-xl)", marginBottom: "var(--space-5)" }} />
          <div aria-hidden className="ui-skeleton" style={{ height: 28, width: "60%", borderRadius: 6, marginBottom: "var(--space-2)" }} />
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden className="ui-skeleton" style={{ height: 24, width: 80, borderRadius: 999 }} />
            ))}
          </div>
          <div aria-hidden className="ui-skeleton" style={{ height: 80, borderRadius: 12, marginBottom: "var(--space-5)" }} />
          <div aria-hidden className="ui-skeleton" style={{ height: 220, borderRadius: 12 }} />
        </div>
      </div>
    </>
  );
}
