import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  effectiveCommunityRole,
  communityPermissionFlags,
} from "@/lib/community-permissions";
import { listContentReports } from "@/lib/services/content-report";
import { ReportsPanel } from "@/components/settings/reports-panel";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { slug } = await params;
  const { status: statusParam } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const isOwner = community.ownerId === session.user.id;
  const membership = !isOwner
    ? await prisma.membership.findUnique({
        where: {
          userId_communityId: {
            userId: session.user.id,
            communityId: community.id,
          },
        },
        select: { role: true },
      })
    : null;

  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: membership?.role,
  });
  const perms = communityPermissionFlags(role);

  if (!perms.canModerateContent) redirect(`/c/${slug}`);

  const showResolved = statusParam === "resolved";

  const { reports, total } = await listContentReports({
    communityId: community.id,
    status: showResolved ? undefined : "PENDING",
    limit: 100,
  });

  const serialized = reports.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  }));

  const pendingCount = showResolved
    ? await prisma.contentReport.count({ where: { communityId: community.id, status: "PENDING" } })
    : total;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Báo cáo nội dung</span>
      </header>

      <div style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <a
            href={`/c/${slug}/reports`}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              textDecoration: "none",
              background: !showResolved ? "var(--brand-green)" : "transparent",
              color: !showResolved ? "#fff" : "var(--text-muted)",
              border: !showResolved ? "none" : "1px solid var(--border-subtle)",
            }}
          >
            Chờ xử lý {pendingCount > 0 && !showResolved ? `(${pendingCount})` : ""}
          </a>
          <a
            href={`/c/${slug}/reports?status=resolved`}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              textDecoration: "none",
              background: showResolved ? "var(--brand-green)" : "transparent",
              color: showResolved ? "#fff" : "var(--text-muted)",
              border: showResolved ? "none" : "1px solid var(--border-subtle)",
            }}
          >
            Đã xử lý
          </a>
        </div>

        <ReportsPanel
          reports={serialized as any}
          total={total}
          communitySlug={slug}
          communityId={community.id}
        />
      </div>
    </>
  );
}
