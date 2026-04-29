import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { McpContext } from "./auth";

/**
 * Wrap a tool implementation: time it, log to AgentToolCall, return result/error.
 * Truncates large args/results to keep DB rows reasonable.
 */
const MAX_JSON_BYTES = 16 * 1024;

function truncate(value: unknown): unknown {
  try {
    const s = JSON.stringify(value);
    if (s.length <= MAX_JSON_BYTES) return value;
    return { __truncated: true, sample: s.slice(0, MAX_JSON_BYTES) };
  } catch {
    return { __unserializable: true };
  }
}

export async function logToolCall(input: {
  ctx: McpContext;
  toolName: string;
  args: unknown;
  result?: unknown;
  errorMessage?: string;
  durationMs: number;
}) {
  try {
    await prisma.agentToolCall.create({
      data: {
        apiKeyId: input.ctx.apiKeyId,
        communityId: input.ctx.communityId,
        userId: input.ctx.ownerId,
        toolName: input.toolName,
        argsJson: truncate(input.args) as object,
        resultJson:
          input.result !== undefined ? (truncate(input.result) as object) : undefined,
        errorMessage: input.errorMessage,
        durationMs: input.durationMs,
      },
    });
  } catch (err) {
    logger.warn(
      { err, toolName: input.toolName },
      "[mcp] failed to log tool call"
    );
  }
}

/** Run a function timed, log, return its result. Re-throws on error after logging. */
export async function withTelemetry<T>(input: {
  ctx: McpContext;
  toolName: string;
  args: unknown;
  fn: () => Promise<T>;
}): Promise<T> {
  const start = Date.now();
  try {
    const result = await input.fn();
    await logToolCall({
      ctx: input.ctx,
      toolName: input.toolName,
      args: input.args,
      result,
      durationMs: Date.now() - start,
    });
    return result;
  } catch (err) {
    await logToolCall({
      ctx: input.ctx,
      toolName: input.toolName,
      args: input.args,
      errorMessage: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    });
    throw err;
  }
}
