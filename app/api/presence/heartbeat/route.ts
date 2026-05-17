import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { recordHeartbeat } from "@/lib/presence";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit({
    key: `presence:${session.user.id}`,
    limit: 30,
    windowSec: 60,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const communityId =
    body && typeof body === "object" && "communityId" in body
      ? (body as { communityId?: unknown }).communityId
      : null;
  if (typeof communityId !== "string" || !communityId) {
    return NextResponse.json({ error: "missing_community_id" }, { status: 400 });
  }

  await recordHeartbeat(communityId, session.user.id);
  return NextResponse.json({ ok: true });
}
