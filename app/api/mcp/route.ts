/**
 * MCP endpoint — Streamable HTTP transport over Web Standard Request/Response.
 * Stateless: every request authenticates via Bearer key, builds a fresh server
 * with that community context, dispatches, returns response.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateRequest } from "@/lib/mcp/auth";
import { buildMcpServer } from "@/lib/mcp/server";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function unauthorized(reason: string) {
  return new Response(
    JSON.stringify({ error: "unauthorized", reason }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": 'Bearer realm="focus.camp MCP"',
      },
    }
  );
}

async function rateLimited() {
  return new Response(
    JSON.stringify({ error: "rate_limited" }),
    { status: 429, headers: { "content-type": "application/json" } }
  );
}

async function handle(req: Request) {
  const ctx = await authenticateRequest(req);
  if (!ctx) return unauthorized("invalid_or_missing_bearer_token");

  // 60 calls/min/key
  const rl = await rateLimit({
    key: `mcp:${ctx.apiKeyId}`,
    limit: 60,
    windowSec: 60,
  });
  if (!rl.ok) return rateLimited();

  try {
    const server = buildMcpServer(ctx);
    const transport = new WebStandardStreamableHTTPServerTransport({
      // Stateless mode — sessionIdGenerator omitted
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return await transport.handleRequest(req);
  } catch (err) {
    logger.error({ err, apiKeyId: ctx.apiKeyId }, "[mcp] handler error");
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}

export async function DELETE(req: Request) {
  return handle(req);
}
