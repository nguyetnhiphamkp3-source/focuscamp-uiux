import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LoginModal } from "@/components/shell/login-modal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  let dbStatus = "❌ Không kết nối được";
  let userCount = 0;
  let communityCount = 0;

  try {
    userCount = await prisma.user.count();
    communityCount = await prisma.community.count();
    dbStatus = "✅ Connected";
  } catch (err) {
    dbStatus = `❌ ${err instanceof Error ? err.message : "Unknown error"}`;
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 3px rgba(60, 45, 20, 0.08)",
          borderRadius: 16,
          padding: 32,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏕️🔥</div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 6,
            color: "var(--text-heading)",
          }}
        >
          focus.camp
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
          Community platform driven by challenges + AI Agents.<br />
          Coming soon.
        </p>

        {session?.user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 14,
              marginBottom: 16,
              borderRadius: 10,
              background: "var(--bg-elevated)",
            }}
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || "avatar"}
                referrerPolicy="no-referrer"
                style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#5865F2,#eb459e)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {(session.user.name || session.user.email || "?")[0].toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "var(--text-heading)" }}>
                Chào {session.user.name || session.user.email}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {session.user.email}
              </div>
            </div>
            <form action={handleSignOut}>
              <button
                type="submit"
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-normal)",
                }}
              >
                Đăng xuất
              </button>
            </form>
          </div>
        )}

        <div
          style={{
            padding: 14,
            marginBottom: 20,
            borderRadius: 10,
            background: "var(--bg-elevated)",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>System status</div>
          <div>Database: {dbStatus}</div>
          <div>Users: {userCount}</div>
          <div>Communities: {communityCount}</div>
          <div>Session: {session?.user ? "✅ Logged in" : "⚪ Guest"}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {session?.user ? (
            <Link
              href="/discovery"
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                fontWeight: 700,
                color: "#fff",
                background: "var(--brand-green)",
                textDecoration: "none",
              }}
            >
              Khám phá cộng đồng
            </Link>
          ) : (
            <>
              <LoginModal
                trigger={
                  <button
                    style={{
                      padding: "12px 20px",
                      borderRadius: 10,
                      fontWeight: 700,
                      color: "#fff",
                      background: "var(--brand-green)",
                      border: "none",
                      fontSize: 15,
                    }}
                  >
                    Đăng nhập
                  </button>
                }
              />
              <Link
                href="/discovery"
                style={{
                  padding: "12px 20px",
                  borderRadius: 10,
                  fontWeight: 700,
                  color: "var(--text-heading)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                }}
              >
                Khám phá
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
