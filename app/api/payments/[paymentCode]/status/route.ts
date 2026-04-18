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
    select: { status: true, receivedAt: true, expiresAt: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Auto-expire if past TTL
  let status = payment.status;
  if (status === "PENDING" && payment.expiresAt < new Date()) {
    await prisma.payment.update({
      where: { paymentCode },
      data: { status: "EXPIRED" },
    });
    status = "EXPIRED";
  }
  return NextResponse.json({ status, receivedAt: payment.receivedAt });
}
