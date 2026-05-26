/**
 * Content Report service — report posts/comments for moderation.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/services/notification";

export const REPORT_REASONS = ["SPAM", "HARASSMENT", "SENSITIVE", "RULE_VIOLATION", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam / Quảng cáo",
  HARASSMENT: "Quấy rối / Bạo lực",
  SENSITIVE: "Nội dung nhạy cảm",
  RULE_VIOLATION: "Vi phạm nội quy",
  OTHER: "Lý do khác",
};

export async function createContentReport(input: {
  reporterId: string;
  targetType: "POST" | "COMMENT";
  postId?: string;
  commentId?: string;
  reason: ReportReason;
  detail?: string;
}) {
  let communityId: string;
  let communitySlug: string;

  if (input.targetType === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: input.postId! },
      select: { communityId: true, community: { select: { slug: true } } },
    });
    if (!post) throw new Error("Bài viết không tồn tại");
    communityId = post.communityId;
    communitySlug = post.community.slug;
  } else {
    const comment = await prisma.comment.findUnique({
      where: { id: input.commentId! },
      select: { post: { select: { communityId: true, community: { select: { slug: true } } } } },
    });
    if (!comment) throw new Error("Bình luận không tồn tại");
    communityId = comment.post.communityId;
    communitySlug = comment.post.community.slug;
  }

  const report = await prisma.contentReport.create({
    data: {
      communityId,
      reporterId: input.reporterId,
      targetType: input.targetType,
      postId: input.postId ?? null,
      commentId: input.commentId ?? null,
      reason: input.reason,
      detail: input.detail?.trim() || null,
    },
  });

  notifyModerators(communityId, communitySlug, input.reporterId, input.reason, input.postId).catch(() => {});
  logger.info({ communityId, reportId: report.id }, "[report] content report created");
  return report;
}

export async function listContentReports(input: {
  communityId: string;
  status?: string;
  limit?: number;
}) {
  const where = {
    communityId: input.communityId,
    ...(input.status && { status: input.status }),
  };
  const [reports, total] = await Promise.all([
    prisma.contentReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit ?? 50,
      include: {
        reporter: { select: { id: true, name: true, image: true } },
        post: { select: { id: true, body: true, user: { select: { name: true } } } },
        comment: { select: { id: true, body: true, user: { select: { name: true } } } },
        resolvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.contentReport.count({ where }),
  ]);
  return { reports, total };
}

export async function resolveContentReport(input: {
  reportId: string;
  resolvedById: string;
  action: "DISMISS" | "DELETE_CONTENT";
  note?: string;
}) {
  const report = await prisma.contentReport.findUnique({ where: { id: input.reportId } });
  if (!report) throw new Error("Báo cáo không tồn tại");
  if (report.status !== "PENDING") throw new Error("Báo cáo đã được xử lý");

  const status = input.action === "DISMISS" ? "DISMISSED" : "ACTION_TAKEN";

  await prisma.contentReport.update({
    where: { id: input.reportId },
    data: {
      status,
      resolvedById: input.resolvedById,
      resolvedAt: new Date(),
      resolveNote: input.note?.trim() || null,
    },
  });

  if (input.action === "DELETE_CONTENT") {
    if (report.targetType === "POST" && report.postId) {
      await prisma.post.delete({ where: { id: report.postId } }).catch(() => {});
    } else if (report.targetType === "COMMENT" && report.commentId) {
      await prisma.comment.delete({ where: { id: report.commentId } }).catch(() => {});
    }
  }

  logger.info({ reportId: input.reportId, action: input.action }, "[report] resolved");
}

export async function pendingReportCount(communityId: string): Promise<number> {
  return prisma.contentReport.count({ where: { communityId, status: "PENDING" } });
}

async function notifyModerators(
  communityId: string,
  communitySlug: string,
  reporterId: string,
  reason: string,
  postId?: string,
) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!community) return;

  const mods = await prisma.membership.findMany({
    where: { communityId, role: { in: ["ADMIN", "MOD"] } },
    select: { userId: true },
  });

  const recipients = new Set([community.ownerId, ...mods.map((m) => m.userId)]);
  const label = REASON_LABELS[reason as ReportReason] ?? reason;

  for (const userId of recipients) {
    createNotification({
      userId,
      type: "CONTENT_REPORT",
      title: "Báo cáo nội dung mới",
      body: `Lý do: ${label}`,
      actorId: reporterId,
      link: `/c/${communitySlug}/reports`,
      communitySlug,
      postId: postId ?? undefined,
    }).catch(() => {});
  }
}
