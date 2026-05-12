/**
 * Google Meet Add-on API
 *
 * Auth: Apps Script sends a Google ID token via X-Google-Identity-Token header.
 * We verify it via the tokeninfo endpoint (no new packages needed).
 * Then dispatch to the appropriate service function.
 *
 * POST /api/meet/addon
 * Body: { action, meetingCode, ...actionPayload }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  getMeetContext,
  recordAttendance,
  activateTask,
  getActiveTask,
  clearActiveTask,
  submitTask,
} from "@/lib/services/meet-addon";

export const dynamic = "force-dynamic";

// ─── JWT verification ──────────────────────────────────────────────────────

async function verifyGoogleIdToken(token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Optionally verify aud matches our client ID
    const expectedAud = process.env.MEET_ADDON_OAUTH_CLIENT_ID;
    if (expectedAud && data.aud !== expectedAud) {
      logger.warn({ aud: data.aud }, "[meet-addon] token aud mismatch");
      return null;
    }
    return typeof data.email === "string" ? data.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Allow bypass in dev via X-Dev-Email header
  let email: string | null = null;
  if (process.env.NODE_ENV === "development") {
    email = req.headers.get("x-dev-email");
  }

  if (!email) {
    const token = req.headers.get("x-google-identity-token");
    if (!token) {
      return NextResponse.json({ error: "missing_token" }, { status: 401 });
    }
    email = await verifyGoogleIdToken(token);
    if (!email) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }
  }

  // Look up focus.camp user by email
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { action, meetingCode } = body as { action?: string; meetingCode?: string };
  if (!action || !meetingCode) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    switch (action) {
      case "context": {
        const ctx = await getMeetContext(user.id, meetingCode);
        if (!ctx) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
        return NextResponse.json(ctx);
      }

      case "attend": {
        const result = await recordAttendance(user.id, meetingCode);
        return NextResponse.json({ ok: true, ...result });
      }

      case "activate_task": {
        const task = body.task as { content?: string; type?: string } | undefined;
        if (!task?.content || !task?.type) {
          return NextResponse.json({ error: "missing_task_fields" }, { status: 400 });
        }
        if (task.type !== "TASK" && task.type !== "CHECKIN") {
          return NextResponse.json({ error: "invalid_task_type" }, { status: 400 });
        }
        const result = await activateTask(user.id, meetingCode, {
          content: task.content,
          type: task.type as "TASK" | "CHECKIN",
        });
        return NextResponse.json(result);
      }

      case "get_task": {
        const task = await getActiveTask(meetingCode);
        return NextResponse.json({ task });
      }

      case "submit_task": {
        const answer = body.answer as string | undefined;
        if (!answer?.trim()) {
          return NextResponse.json({ error: "missing_answer" }, { status: 400 });
        }
        const result = await submitTask(user.id, meetingCode, answer);
        return NextResponse.json({ ok: true, ...result });
      }

      case "clear_task": {
        const result = await clearActiveTask(user.id, meetingCode);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  } catch (err) {
    logger.error({ err, action, email }, "[meet-addon] action error");
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
