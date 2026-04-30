/**
 * Event / Calendar booking service.
 * v1: simple model — owner creates event, member books, optional payment via SePay.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createPayment } from "@/lib/sepay";
import { assertCommunityCanWrite } from "./community";

async function assertCommunityOwner(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  if (c.ownerId !== userId) throw new Error("Chỉ owner mới tạo được event");
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
  return ev;
}

export async function listEvents(input: {
  communityId: string;
  scope?: "upcoming" | "past" | "all";
}) {
  const now = new Date();
  const where: { communityId: string; status?: string; startsAt?: { gte?: Date; lt?: Date } } = {
    communityId: input.communityId,
  };
  if (input.scope === "upcoming") {
    where.startsAt = { gte: now };
    where.status = "OPEN";
  } else if (input.scope === "past") {
    where.startsAt = { lt: now };
  }
  return prisma.event.findMany({
    where,
    orderBy: { startsAt: input.scope === "past" ? "desc" : "asc" },
    include: {
      _count: { select: { bookings: true } },
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
  if (event._count.bookings >= event.capacity) throw new Error("Event đã đủ chỗ");

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
  if (existing && existing.status === "CONFIRMED") return { status: "CONFIRMED" };

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

  const payment = await createPayment({
    userId: input.userId,
    communityId: event.communityId,
    purpose: "event",
    refType: "event",
    refId: booking.id,
    amountVnd: event.priceVnd,
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
