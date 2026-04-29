import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "var(--bg-body)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 480,
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 12 }}>🏕️</div>
        <h1
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: 800,
            color: "var(--header-primary)",
            marginBottom: 10,
          }}
        >
          Trang không tồn tại
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "var(--text-base)",
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          Đường link bạn truy cập không có. Có thể đã bị xoá hoặc nhập sai.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              fontWeight: 700,
              color: "#fff",
              background: "var(--brand-green)",
              textDecoration: "none",
              fontSize: "var(--text-base)",
            }}
          >
            Về trang chủ
          </Link>
          <Link
            href="/discovery"
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              fontWeight: 700,
              color: "var(--header-primary)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              textDecoration: "none",
              fontSize: "var(--text-base)",
            }}
          >
            Khám phá cộng đồng
          </Link>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "404 — focus.camp",
};
