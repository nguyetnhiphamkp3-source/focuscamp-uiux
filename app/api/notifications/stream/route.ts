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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Subscribe to this user's notification channel
      const unsub = subscribe(`notification:${userId}`, (data) => {
        try {
          controller.enqueue(
            encoder.encode(`event: notification\ndata: ${data}\n\n`),
          );
        } catch {
          // Stream closed
          unsub();
          clearInterval(heartbeat);
        }
      });

      // Cleanup on close
      const cleanup = () => {
        unsub();
        clearInterval(heartbeat);
      };

      // AbortController-style cleanup isn't available in ReadableStream,
      // but controller.close() from the client side will cause enqueue to throw
      // which triggers cleanup in the catch blocks above.
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
