export default function VerifyPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-body)" }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="text-5xl mb-3">📬</div>
        <h1
          className="text-2xl font-extrabold mb-2"
          style={{ color: "var(--text-heading)" }}
        >
          Check email của bạn
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Mình đã gửi magic link đến email bạn nhập. Click link đó để đăng nhập.
          Link có hiệu lực 24h.
        </p>
      </div>
    </main>
  );
}
