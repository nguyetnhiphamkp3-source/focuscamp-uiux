export default function Loading() {
  return (
    <>
      <header className="view-header">
        <span style={{ fontSize: "var(--text-sm)", color: "var(--interactive-normal)" }}>← Quay lại</span>
        <span className="view-title" style={{ marginLeft: 12, opacity: 0.5 }}>Đang tải bài…</span>
      </header>
      <div className="feed-view">
        <div className="feed-inner">
          <article className="feed-post" style={{ marginBottom: 0 }}>
            <div className="feed-post-head">
              <div aria-hidden className="ui-skeleton feed-post-avatar" style={{ flexShrink: 0 }} />
              <div className="feed-post-author-wrap" style={{ flex: 1 }}>
                <div aria-hidden className="ui-skeleton" style={{ height: 14, width: 140, borderRadius: 4, marginBottom: 6 }} />
                <div aria-hidden className="ui-skeleton" style={{ height: 12, width: 100, borderRadius: 4 }} />
              </div>
            </div>
            <div aria-hidden className="ui-skeleton" style={{ height: 28, width: "70%", borderRadius: 6, margin: "16px 0" }} />
            <div aria-hidden className="ui-skeleton" style={{ height: 14, width: "100%", borderRadius: 4, marginBottom: 8 }} />
            <div aria-hidden className="ui-skeleton" style={{ height: 14, width: "95%", borderRadius: 4, marginBottom: 8 }} />
            <div aria-hidden className="ui-skeleton" style={{ height: 14, width: "80%", borderRadius: 4 }} />
          </article>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
            <div aria-hidden className="ui-skeleton" style={{ height: 22, width: 200, borderRadius: 6, marginBottom: 16 }} />
            <div aria-hidden className="ui-skeleton" style={{ height: 60, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    </>
  );
}
