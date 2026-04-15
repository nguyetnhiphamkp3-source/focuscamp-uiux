import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const isOwner = community.ownerId === session.user.id;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Community Settings</span>
        <span className="view-subtitle">{community.name}</span>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-6) var(--space-8)",
        }}
      >
        <div style={{ maxWidth: 800 }}>
          {!isOwner && (
            <div
              style={{
                background: "var(--danger-soft)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--r-md)",
                padding: "var(--space-3)",
                color: "var(--danger)",
                fontSize: "var(--text-sm)",
                marginBottom: "var(--space-4)",
              }}
            >
              ⚠️ Bạn không phải chủ cộng đồng. Chỉ xem read-only.
            </div>
          )}

          <div className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
            <h2 style={{ marginBottom: "var(--space-3)" }}>Thông tin cộng đồng</h2>
            <Row label="Slug" value={community.slug} />
            <Row label="Name" value={community.name} />
            <Row label="Tagline" value={community.tagline || "—"} />
            <Row label="Members" value={String(community.memberCount)} />
            <Row
              label="Created"
              value={community.createdAt.toLocaleDateString("vi-VN")}
            />
          </div>

          <div className="ui-empty">
            <div className="ui-empty-icon">⚙️</div>
            Các tuỳ chỉnh khác đang hoàn thiện (classes, pillars, gems, billing...).
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "var(--space-2) 0",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--text-base)",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <strong style={{ color: "var(--text-heading)" }}>{value}</strong>
    </div>
  );
}
