import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paymentCode: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { paymentCode } = await params;
  const payment = await prisma.payment.findUnique({
    where: { paymentCode, userId: session.user.id },
    select: { id: true, status: true, receivedAt: true, expiresAt: true, couponId: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Auto-expire if past TTL
  let status = payment.status;
  if (status === "PENDING" && payment.expiresAt < new Date()) {
    const expired = await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    if (expired.count > 0 && payment.couponId) {
      await prisma.couponRedemption.updateMany({
        where: { paymentId: payment.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
    }
    if (expired.count > 0) {
      status = "EXPIRED";
    } else {
      const latest = await prisma.payment.findUnique({
        where: { id: payment.id },
        select: { status: true },
      });
      status = latest?.status ?? status;
    }
  }
  return NextResponse.json({ status, receivedAt: payment.receivedAt });
}
