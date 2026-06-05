/**
 * SSE endpoint for real-time notification push.
 * Replaces 30s polling with server-sent events.
 *
 * Client connects: GET /api/notifications/stream
 * Server sends: event: notification\ndata: {...}\n\n
 */
import { auth } from "@/auth";
import { subscribe } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      // Single idempotent teardown — unsubscribe + stop the heartbeat exactly once.
      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsub();
        clearInterval(heartbeat);
      };

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, 30_000);

      // Subscribe to this user's notification channel
      const unsub = subscribe(`notification:${userId}`, (data) => {
        try {
          controller.enqueue(
            encoder.encode(`event: notification\ndata: ${data}\n\n`),
          );
        } catch {
          cleanup();
        }
      });

      // Primary teardown: the request is aborted when the client disconnects, so we
      // unsubscribe immediately instead of waiting for the next failed enqueue
      // (which otherwise leaks the listener until a publish happens, if ever).
      request.signal.addEventListener("abort", cleanup);
      if (request.signal.aborted) cleanup();

      controller.enqueue(encoder.encode(": connected\n\n"));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx buffering
    },
  });
}
