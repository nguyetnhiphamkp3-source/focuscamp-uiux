import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unreadCount } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

/**
 * Poll endpoint for the notification bell. Returns `{unread: N}`.
 * Deliberately returns 0 for guests so the poller on a signed-out page
 * doesn't error-loop.
 */
export async function GET() {
  try {
    const s = await auth();
    if (!s?.user?.id) return NextResponse.json({ unread: 0 });
    const count = await unreadCount(s.user.id);
    return NextResponse.json({ unread: count });
  } catch {
    return NextResponse.json({ unread: 0 });
  }
}
