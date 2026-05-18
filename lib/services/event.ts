/**
 * Event / Calendar booking service.
 * v1: simple model — owner creates event, member books, optional payment via SePay.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createPayment } from "@/lib/sepay";
import { getPaymentConfig } from "@/lib/community-config";
import { assertCommunityCanWrite } from "./community";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";
import { getGoogleAccessToken } from "./google-oauth";
import {
  createMeetSpace,
  getConferenceRecord,
  getRecordingLinks,
  getTranscriptLinks,
  getAttendees,
} from "@/lib/integrations/google-meet";

async function assertCommunityOwner(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      ownerId: true,
      memberships: { where: { userId }, select: { role: true } },
    },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: c.ownerId === userId,
    membershipRole: c.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_events")) {
    throw new Error("Cần quyền ADMIN để quản lý event");
  }
}

export async function createEvent(input: {
  userId: string;
  communityId: string;
  type: "ONE_ON_ONE" | "GROUP_LIVE" | "WORKSHOP";
  title: string;
  description?: string;
  startsAt: Date;
  durationMin: number;
  capacity: number;
  priceVnd?: number;
  meetingUrl?: string;
  bannerUrl?: string;
}) {
  await assertCommunityOwner(input.userId, input.communityId);
  await assertCommunityCanWrite(input.communityId);
  const ev = await prisma.event.create({
    data: {
      communityId: input.communityId,
      ownerId: input.userId,
      type: input.type,
      title: input.title,
      description: input.description?.trim() || null,
      startsAt: input.startsAt,
      durationMin: input.durationMin,
      capacity: input.capacity,
      priceVnd: input.priceVnd ?? 0,
      isFree: !input.priceVnd || input.priceVnd === 0,
      meetingUrl: input.meetingUrl?.trim() || null,
      bannerUrl: input.bannerUrl?.trim() || null,
    },
  });
  logger.info({ eventId: ev.id, by: input.userId }, "[event] created");

  // Auto-generate Google Meet space if no manual URL provided
  if (!input.meetingUrl) {
    const token = await getGoogleAccessToken(input.userId).catch(() => null);
    if (token) {
      const space = await createMeetSpace(token, {
        autoRecording: true,
        autoTranscription: true,
      });
      if (space) {
        await prisma.event.update({
          where: { id: ev.id },
          data: { meetingUrl: space.meetingUri, meetSpaceName: space.spaceName },
        });
        logger.info({ eventId: ev.id, space: space.spaceName }, "[event] meet space created");
        return { ...ev, meetingUrl: space.meetingUri, meetSpaceName: space.spaceName };
      }
    }
  }

  return ev;
}

export async function listEvents(input: {
  communityId: string;
  viewerUserId?: string;
  scope?: "upcoming" | "past" | "all";
}) {
  const now = new Date();
  const where: { communityId: string; status?: string; startsAt?: { gte?: Date; lt?: Date } } = {
    communityId: input.communityId,
  };
  if (input.scope === "upcoming") {
    // Include events started within the last 4h so live/in-progress events still appear
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    where.startsAt = { gte: fourHoursAgo };
    where.status = "OPEN";
  } else if (input.scope === "past") {
    where.startsAt = { lt: now };
  }
  return prisma.event.findMany({
    where,
    orderBy: { startsAt: input.scope === "past" ? "desc" : "asc" },
    include: {
      _count: { select: { bookings: true } },
      bookings: input.viewerUserId
        ? {
            where: { userId: input.viewerUserId },
            select: { id: true, status: true, attendedAt: true },
            take: 1,
          }
        : false,
    },
  });
}

export async function bookEvent(input: {
  userId: string;
  eventId: string;
}): Promise<{ status: "CONFIRMED" } | { status: "PENDING_PAYMENT"; paymentCode: string }> {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: {
      id: true,
      communityId: true,
      isFree: true,
      priceVnd: true,
      capacity: true,
      status: true,
      _count: { select: { bookings: true } },
    },
  });
  if (!event) throw new Error("Event không tồn tại");
  if (event.status !== "OPEN") throw new Error("Event đã đóng");

  // Membership required
  const m = await prisma.membership.findUnique({
    where: {
      userId_communityId: { userId: input.userId, communityId: event.communityId },
    },
    select: { id: true },
  });
  if (!m) throw new Error("Cần là thành viên cộng đồng để book");

  // Idempotent: existing booking?
  const existing = await prisma.eventBooking.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: input.userId } },
  });
  if (existing && (existing.status === "CONFIRMED" || existing.status === "ATTENDED")) {
    return { status: "CONFIRMED" };
  }

  const existingReservesSeat = existing?.status === "PENDING";
  if (event._count.bookings >= event.capacity && !existingReservesSeat) {
    throw new Error("Event đã đủ chỗ");
  }

  if (event.isFree) {
    if (existing) {
      await prisma.eventBooking.update({
        where: { id: existing.id },
        data: { status: "CONFIRMED" },
      });
    } else {
      await prisma.eventBooking.create({
        data: {
          eventId: event.id,
          userId: input.userId,
          status: "CONFIRMED",
        },
      });
    }
    logger.info({ eventId: event.id, userId: input.userId }, "[event] free booked");
    return { status: "CONFIRMED" };
  }

  // Paid: create or reuse pending booking + new payment
  const booking =
    existing ??
    (await prisma.eventBooking.create({
      data: {
        eventId: event.id,
        userId: input.userId,
        status: "PENDING",
      },
    }));

  const community = await prisma.community.findUnique({
    where: { id: event.communityId },
    select: { billingModel: true },
  });
  const bankCfg = community ? getPaymentConfig(community) : null;
  if (!bankCfg) throw new Error("payment_not_configured");
  const payment = await createPayment({
    userId: input.userId,
    communityId: event.communityId,
    purpose: "event",
    refType: "event",
    refId: booking.id,
    amountVnd: event.priceVnd,
    bankCode: bankCfg.bankCode,
    bankAccount: bankCfg.bankAccount,
    bankHolder: bankCfg.bankHolder,
    bankName: bankCfg.bankName,
  });
  logger.info(
    { eventId: event.id, bookingId: booking.id, paymentCode: payment.paymentCode },
    "[event] payment started"
  );
  return { status: "PENDING_PAYMENT", paymentCode: payment.paymentCode };
}

export async function confirmEventBooking(bookingId: string, paymentRef: string) {
  await prisma.eventBooking.updateMany({
    where: { id: bookingId, status: "PENDING" },
    data: { status: "CONFIRMED", paymentRef },
  });
  logger.info({ bookingId }, "[event] booking confirmed");
}

/**
 * Fetch post-meeting data (recordings, transcripts, attendance) from Meet API.
 * Lazy-fetches on event detail page load after event end time.
 * Idempotent — skips if already fetched (meetRecordingUrl set or no spaceName).
 */
export async function fetchPostMeetingData(
  eventId: string,
  ownerUserId: string
): Promise<{
  recordingUrl: string | null;
  transcriptUrl: string | null;
  attendees: { displayName: string; joinedAt?: string; leftAt?: string }[];
} | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      meetSpaceName: true,
      meetRecordingUrl: true,
      meetTranscriptUrl: true,
      bookings: { where: { status: "CONFIRMED" }, select: { id: true, userId: true } },
    },
  });
  if (!event?.meetSpaceName) return null;
  if (event.meetRecordingUrl) {
    // Already fetched — return cached
    return {
      recordingUrl: event.meetRecordingUrl,
      transcriptUrl: event.meetTranscriptUrl,
      attendees: [],
    };
  }

  const token = await getGoogleAccessToken(ownerUserId).catch(() => null);
  if (!token) return null;

  const record = await getConferenceRecord(token, event.meetSpaceName);
  if (!record) return null;

  const [recordings, transcripts, attendees] = await Promise.all([
    getRecordingLinks(token, record.name),
    getTranscriptLinks(token, record.name),
    getAttendees(token, record.name),
  ]);

  const recordingUrl = recordings[0] ?? null;
  const transcriptUrl = transcripts[0] ?? null;
  const endedAt = record.endTime ? new Date(record.endTime) : null;

  // Cache results
  await prisma.event.update({
    where: { id: eventId },
    data: {
      meetRecordingUrl: recordingUrl,
      meetTranscriptUrl: transcriptUrl,
      ...(endedAt ? { meetEndedAt: endedAt } : {}),
    },
  });

  // Mark confirmed bookings as ATTENDED if participant was in the call
  if (attendees.length > 0) {
    for (const booking of event.bookings) {
      const joined = attendees.find((a) => a.joinedAt);
      if (joined) {
        await prisma.eventBooking.update({
          where: { id: booking.id },
          data: { status: "ATTENDED", attendedAt: joined.joinedAt ? new Date(joined.joinedAt) : new Date() },
        }).catch(() => null);
      }
    }
  }

  logger.info({ eventId, recordingUrl, transcriptUrl }, "[event] post-meeting data fetched");
  return { recordingUrl, transcriptUrl, attendees };
}
