import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const inviteUrl = `https://focus.camp/c/${community.slug}`;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Invite People</span>
        <span className="view-subtitle">Mời bạn bè tham gia {community.name}</span>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px 24px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 16,
            padding: 28,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>✉️</div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-heading)",
              marginBottom: 6,
            }}
          >
            Mời bạn bè vào {community.name}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            Chia sẻ link bên dưới để bạn bè tham gia cộng đồng.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <input
              type="text"
              readOnly
              defaultValue={inviteUrl}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-elevated)",
                color: "var(--text-normal)",
                fontSize: 14,
              }}
            />
            <button
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--brand-green)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Copy
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              ["📱", "Telegram"],
              ["💬", "Zalo"],
              ["📘", "Facebook"],
              ["🐦", "X / Twitter"],
            ].map(([icon, name]) => (
              <button
                key={name}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-normal)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {icon} {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
