/**
 * Google Meet Add-on backend service.
 *
 * Handles: attendance marking, realtime task state, task/checkin submission.
 * Redis stores ephemeral meet session state (active task). Falls back to
 * in-memory Map when Redis is unavailable (single-pod VPS is fine).
 */
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { awardXp, bumpCommunityStreak } from "@/lib/services/xp";
import { publish } from "@/lib/realtime";
import { enqueueNotification } from "@/lib/queue";

// ─── In-memory fallback ────────────────────────────────────────────────────

interface MeetSession {
  mode: "idle" | "task" | "checkin";
  content: string;
  type: "TASK" | "CHECKIN";
  activatedAt: string;
}

const memStore = new Map<string, MeetSession>();

async function getSession(eventId: string): Promise<MeetSession | null> {
  if (redis) {
    try {
      const raw = await redis.get(`meet:session:${eventId}`);
      return raw ? (JSON.parse(raw) as MeetSession) : null;
    } catch {
      // fall through to memory
    }
  }
  return memStore.get(eventId) ?? null;
}

async function setSession(eventId: string, session: MeetSession): Promise<void> {
  if (redis) {
    try {
      await redis.set(
        `meet:session:${eventId}`,
        JSON.stringify(session),
        "EX",
        8 * 60 * 60 // 8h TTL
      );
      return;
    } catch {
      // fall through to memory
    }
  }
  memStore.set(eventId, session);
}

async function clearSession(eventId: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(`meet:session:${eventId}`);
      return;
    } catch {
      // fall through
    }
  }
  memStore.delete(eventId);
}

// ─── Event lookup ──────────────────────────────────────────────────────────

/**
 * Find a focus.camp Event by the Google Meet meeting code.
 * Tries meetingUrl (LIKE %code%) and meetSpaceName (LIKE %code%).
 * Only events within a ±3h window of now are returned.
 */
export async function getEventByMeetCode(meetingCode: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const code = meetingCode.trim().toLowerCase();

  return prisma.event.findFirst({
    where: {
      startsAt: { gte: windowStart, lte: windowEnd },
      OR: [
        { meetingUrl: { contains: code, mode: "insensitive" } },
        { meetSpaceName: { contains: code, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      communityId: true,
      ownerId: true,
      startsAt: true,
      durationMin: true,
      meetingUrl: true,
      meetSpaceName: true,
    },
  });
}

// ─── Context ───────────────────────────────────────────────────────────────

export async function getMeetContext(userId: string, meetingCode: string) {
  const event = await getEventByMeetCode(meetingCode);
  if (!event) return null;

  const booking = await prisma.eventBooking.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
    select: { status: true },
  });

  const isHost = event.ownerId === userId;
  const myStatus = booking?.status ?? null;
  const activeTask = await getSession(event.id);

  return {
    event: { id: event.id, title: event.title, startsAt: event.startsAt },
    myStatus,
    isHost,
    activeTask: activeTask?.mode !== "idle" ? activeTask : null,
  };
}

// ─── Attendance ────────────────────────────────────────────────────────────

export async function recordAttendance(userId: string, meetingCode: string) {
  const event = await getEventByMeetCode(meetingCode);
  if (!event) throw new Error("Event không tìm thấy cho meeting code này");

  const booking = await prisma.eventBooking.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
  });
  if (!booking) throw new Error("Cần book event trước khi điểm danh");
  if (booking.status === "ATTENDED") {
    // Idempotent — already attended, just return cached XP
    return { xpAwarded: 0, alreadyAttended: true };
  }

  await prisma.eventBooking.update({
    where: { id: booking.id },
    data: { status: "ATTENDED", attendedAt: new Date() },
  });

  // Award XP with streak multiplier
  await bumpCommunityStreak({ userId, communityId: event.communityId });
  const xpResult = await awardXp({
    userId,
    communityId: event.communityId,
    reason: "CHECKIN",
    reasonId: booking.id,
    applyStreakMultiplier: true,
  });

  logger.info({ eventId: event.id, userId }, "[meet-addon] attendance recorded");
  return { xpAwarded: xpResult?.amount ?? 5, alreadyAttended: false };
}

// ─── Task management (host only) ──────────────────────────────────────────

export async function activateTask(
  userId: string,
  meetingCode: string,
  task: { content: string; type: "TASK" | "CHECKIN" }
) {
  const event = await getEventByMeetCode(meetingCode);
  if (!event) throw new Error("Event không tìm thấy");
  if (event.ownerId !== userId) throw new Error("Chỉ host mới có thể tạo task");

  const session: MeetSession = {
    mode: task.type === "CHECKIN" ? "checkin" : "task",
    content: task.content.trim(),
    type: task.type,
    activatedAt: new Date().toISOString(),
  };
  await setSession(event.id, session);

  // Notify members via realtime + queue
  await publish(`event:${event.id}:task`, { type: "task_activated", task: session });

  // Fire-and-forget notification to all confirmed bookings
  const bookings = await prisma.eventBooking.findMany({
    where: { eventId: event.id, status: { in: ["CONFIRMED", "ATTENDED"] } },
    select: { userId: true },
  });
  for (const b of bookings) {
    if (b.userId === userId) continue; // skip host
    await enqueueNotification({
      userId: b.userId,
      type: "MEET_TASK",
      title: `Có ${task.type === "CHECKIN" ? "check-in" : "bài tập"} mới trong Meet!`,
      body: task.content.slice(0, 100),
    });
  }

  logger.info({ eventId: event.id, type: task.type }, "[meet-addon] task activated");
  return { ok: true };
}

export async function getActiveTask(meetingCode: string) {
  const event = await getEventByMeetCode(meetingCode);
  if (!event) return null;
  const session = await getSession(event.id);
  return session?.mode !== "idle" ? session : null;
}

export async function clearActiveTask(userId: string, meetingCode: string) {
  const event = await getEventByMeetCode(meetingCode);
  if (!event) throw new Error("Event không tìm thấy");
  if (event.ownerId !== userId) throw new Error("Chỉ host mới có thể xóa task");
  await clearSession(event.id);
  await publish(`event:${event.id}:task`, { type: "task_cleared" });
  logger.info({ eventId: event.id }, "[meet-addon] task cleared");
  return { ok: true };
}

// ─── Task submission (members) ─────────────────────────────────────────────

export async function submitTask(
  userId: string,
  meetingCode: string,
  answer: string
) {
  const event = await getEventByMeetCode(meetingCode);
  if (!event) throw new Error("Event không tìm thấy");

  const session = await getSession(event.id);
  if (!session || session.mode === "idle") {
    throw new Error("Không có task nào đang hoạt động");
  }

  const booking = await prisma.eventBooking.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
  });
  if (!booking) throw new Error("Cần book event trước");

  // Award XP for participation
  await bumpCommunityStreak({ userId, communityId: event.communityId });
  const xpResult = await awardXp({
    userId,
    communityId: event.communityId,
    reason: "CHECKIN",
    reasonId: booking.id,
    applyStreakMultiplier: true,
  });

  logger.info(
    { eventId: event.id, userId, taskType: session.type, answerLen: answer.length },
    "[meet-addon] task submitted"
  );
  return { xpAwarded: xpResult?.amount ?? 5 };
}
