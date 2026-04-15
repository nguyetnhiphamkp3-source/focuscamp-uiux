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
          padding: "var(--space-10) var(--space-6)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          className="ui-card ui-card-lg"
          style={{
            width: "100%",
            maxWidth: 520,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: "var(--space-2)" }}>✉️</div>
          <h1 style={{ marginBottom: "var(--space-2)" }}>
            Mời bạn bè vào {community.name}
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              marginBottom: "var(--space-6)",
              lineHeight: "var(--lh-normal)",
            }}
          >
            Chia sẻ link bên dưới để bạn bè tham gia cộng đồng.
          </p>

          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              marginBottom: "var(--space-4)",
            }}
          >
            <input
              type="text"
              readOnly
              defaultValue={inviteUrl}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-elevated)",
                color: "var(--text-normal)",
                fontSize: "var(--text-sm)",
              }}
            />
            <button className="ui-btn ui-btn-primary ui-btn-sm">Copy</button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              ["📱", "Telegram"],
              ["💬", "Zalo"],
              ["📘", "Facebook"],
              ["🐦", "X"],
            ].map(([icon, name]) => (
              <button
                key={name}
                className="ui-btn ui-btn-secondary ui-btn-sm"
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
