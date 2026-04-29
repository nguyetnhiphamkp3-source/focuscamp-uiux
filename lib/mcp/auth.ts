/**
 * Resolve a Bearer token from the incoming Request to a per-community context.
 * Throws nothing — returns null on any auth failure. Caller decides response.
 */
import { resolveApiKey, type ResolvedApiKey } from "@/lib/api-keys";

export interface McpContext {
  apiKeyId: string;
  communityId: string;
  ownerId: string;
  scopes: string[];
}

export async function authenticateRequest(req: Request): Promise<McpContext | null> {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const resolved: ResolvedApiKey | null = await resolveApiKey(header);
  if (!resolved) return null;
  return {
    apiKeyId: resolved.apiKeyId,
    communityId: resolved.communityId,
    ownerId: resolved.ownerId,
    scopes: resolved.scopes,
  };
}

export function hasScope(ctx: McpContext, needed: "read" | "write" | "admin"): boolean {
  return ctx.scopes.includes(needed);
}
