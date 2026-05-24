export default function Loading() {
  return (
    <>
      <header className="view-header">
        <span className="view-title" style={{ opacity: 0.5 }}>Đang tải challenge…</span>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-5) var(--space-6) var(--space-10)",
          background: "var(--bg-chat)",
        }}
      >
        <div className="ch-inner ch-detail">
          <div
            aria-hidden
            style={{
              aspectRatio: "16 / 9",
              borderRadius: 14,
              background:
                "linear-gradient(110deg, var(--bg-elevated) 30%, var(--bg-card) 50%, var(--bg-elevated) 70%)",
              backgroundSize: "200% 100%",
              animation: "ch-shimmer 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              marginTop: "var(--space-3)",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-hidden
                style={{
                  flex: 1,
                  height: 20,
                  borderRadius: 6,
                  background:
                    "linear-gradient(110deg, var(--bg-elevated) 30%, var(--bg-card) 50%, var(--bg-elevated) 70%)",
                  backgroundSize: "200% 100%",
                  animation: "ch-shimmer 1.4s ease-in-out infinite",
                }}
              />
            ))}
          </div>
          <div
            aria-hidden
            style={{
              marginTop: "var(--space-5)",
              height: 120,
              borderRadius: 12,
              background:
                "linear-gradient(110deg, var(--bg-elevated) 30%, var(--bg-card) 50%, var(--bg-elevated) 70%)",
              backgroundSize: "200% 100%",
              animation: "ch-shimmer 1.4s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes ch-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="ch-shimmer"] { animation: none !important; }
        }
      `}</style>
    </>
  );
}
