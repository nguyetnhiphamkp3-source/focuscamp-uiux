/**
 * Protected download for a challenge task's gift file.
 * - Auth required.
 * - User must have an APPROVED check-in for this task, OR be a community admin
 *   (manage_challenges) so owners can verify the gift.
 * - Returns 302 redirect to a short-lived presigned R2 URL (15 min).
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl, keyFromPublicUrl } from "@/lib/storage";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const task = await prisma.challengeTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      giftFileUrl: true,
      challenge: { select: { community: { select: { id: true, ownerId: true } } } },
    },
  });
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!task.giftFileUrl) {
    return NextResponse.json(
      { error: "no_file", message: "Task này không có file quà" },
      { status: 404 }
    );
  }

  // Permission: APPROVED check-in for this task, else community admin bypass.
  const approved = await prisma.checkin.findFirst({
    where: { taskId, userId: s.user.id, status: "APPROVED" },
    select: { id: true },
  });
  if (!approved) {
    const community = task.challenge.community;
    const isOwner = community.ownerId === s.user.id;
    let isAdmin = isOwner;
    if (!isAdmin) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_communityId: { userId: s.user.id, communityId: community.id },
        },
        select: { role: true },
      });
      const role = effectiveCommunityRole({ isOwner, membershipRole: membership?.role });
      isAdmin = canCommunity(role, "manage_challenges");
    }
    if (!isAdmin) {
      return NextResponse.json(
        { error: "not_unlocked", message: "Hoàn thành task này để mở quà" },
        { status: 403 }
      );
    }
  }

  const key = keyFromPublicUrl(task.giftFileUrl);
  if (!key) {
    logger.warn({ taskId, fileUrl: task.giftFileUrl }, "[gift] cannot derive key from giftFileUrl");
    return NextResponse.json({ error: "bad_file_url" }, { status: 500 });
  }

  // Use the file basename's extension, prefixed with task title, as download name.
  const basename = key.split("/").pop() || "download";
  const dotIdx = basename.lastIndexOf(".");
  const ext = dotIdx > 0 ? basename.slice(dotIdx) : "";
  const safeName = task.title.replace(/[^\w\s.-]/g, "_").slice(0, 80) + ext;

  const url = await getPresignedDownloadUrl({
    key,
    filename: safeName,
    expiresIn: 900,
  });
  if (!url) {
    return NextResponse.json({ error: "presign_failed" }, { status: 500 });
  }

  logger.info({ taskId, userId: s.user.id, key }, "[gift] presigned");
  return NextResponse.redirect(url, 302);
}
