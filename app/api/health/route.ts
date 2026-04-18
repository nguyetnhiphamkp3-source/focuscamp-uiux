/**
 * Health check endpoint for uptime monitors / load balancers.
 * Returns 200 if DB reachable, 503 otherwise.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        db: "up",
        uptime: process.uptime(),
        latencyMs: Date.now() - start,
        ts: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error({ err }, "[health] DB check failed");
    return NextResponse.json(
      {
        status: "degraded",
        db: "down",
        ts: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
