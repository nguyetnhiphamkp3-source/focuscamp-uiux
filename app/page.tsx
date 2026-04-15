import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-body)" }}
    >
      <div
        className="max-w-2xl w-full rounded-2xl p-10"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 3px rgba(60, 45, 20, 0.08)",
        }}
      >
        <div className="text-5xl mb-3">🏕️🔥</div>
        <h1
          className="text-3xl font-extrabold mb-2"
          style={{ color: "var(--text-heading)" }}
        >
          focus.camp
        </h1>
        <p className="text-base mb-6" style={{ color: "var(--text-muted)" }}>
          Community platform driven by challenges + AI Agents.
          <br />
          Coming soon.
        </p>

        {session?.user ? (
          <div
            className="rounded-lg p-4 mb-6 flex items-center gap-3"
            style={{ background: "var(--bg-elevated)" }}
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || "avatar"}
                className="w-10 h-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "linear-gradient(135deg, #5865F2, #eb459e)" }}
              >
                {(session.user.name || session.user.email || "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div
                className="font-bold"
                style={{ color: "var(--text-heading)" }}
              >
                Chào {session.user.name || session.user.email}
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {session.user.email}
              </div>
            </div>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md text-sm"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-normal)",
                }}
              >
                Đăng xuất
              </button>
            </form>
          </div>
        ) : null}

        <div
          className="rounded-lg p-4 mb-6 text-sm"
          style={{ background: "var(--bg-elevated)" }}
        >
          <div className="font-semibold mb-1">System status</div>
          <div>Database: {dbStatus}</div>
          <div>Users: {userCount}</div>
          <div>Communities: {communityCount}</div>
          <div>Session: {session?.user ? "✅ Logged in" : "⚪ Guest"}</div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {session?.user ? (
            <Link
              href="/discovery"
              className="px-6 py-3 rounded-lg font-bold text-white"
              style={{
                background: "var(--brand-green)",
                fontFamily: "var(--font-roboto)",
              }}
            >
              Khám phá cộng đồng
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-6 py-3 rounded-lg font-bold text-white"
                style={{
                  background: "var(--brand-green)",
                  fontFamily: "var(--font-roboto)",
                }}
              >
                Đăng nhập
              </Link>
              <Link
                href="/discovery"
                className="px-6 py-3 rounded-lg font-bold"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-heading)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                Khám phá
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
