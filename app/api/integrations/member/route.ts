/**
 * External member provisioning webhook.
 *
 * An external landing page calls this after a customer pays, to create the
 * customer's focus.camp account (passwordless), join them to the community
 * (free tier) and optionally enroll them in a challenge — without a focus.camp
 * payment. A magic-link login email is sent to brand-new accounts.
 *
 * Security:
 * - Authorization: "Bearer fc_live_<key>" — a community ApiKey with the
 *   "provision_members" scope (created in Settings → Tích hợp).
 * - Rate limited per IP.
 * - Input validated via Zod.
 * - Idempotent per (apiKey, externalOrderId) — LDP retries are safe.
 */
import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { resolveApiKey } from "@/lib/api-keys";
import { ExternalMemberWebhookSchema } from "@/lib/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger, logError } from "@/lib/logger";
import { provisionExternalMember } from "@/lib/services/external-member";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 0. Rate limit per IP.
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `extmember:${ip}`, limit: 60, windowSec: 60 });
  if (!rl.ok) {
    logger.warn({ ip, resetAt: rl.resetAt }, "[external-member] rate limited");
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 1. Authenticate via ApiKey + require provision_members scope.
  const key = await resolveApiKey(req.headers.get("authorization"));
  if (!key) {
    logger.warn({ ip }, "[external-member] unauthorized");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!key.scopes.includes("provision_members")) {
    logger.warn(
      { ip, apiKeyId: key.apiKeyId },
      "[external-member] missing provision_members scope"
    );
    return NextResponse.json({ ok: false, error: "insufficient_scope" }, { status: 403 });
  }

  // 1b. Rate limit per KEY too — the key is the real principal here, and the
  // per-IP bucket is both spoofable (X-Forwarded-For) and too coarse. This caps
  // magic-link email volume from a single (possibly leaked) landing-page key.
  const keyRl = await rateLimit({ key: `extmember-key:${key.apiKeyId}`, limit: 60, windowSec: 60 });
  if (!keyRl.ok) {
    logger.warn({ apiKeyId: key.apiKeyId, resetAt: keyRl.resetAt }, "[external-member] key rate limited");
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 2. Parse + validate payload.
  let body;
  try {
    body = ExternalMemberWebhookSchema.parse(await req.json());
  } catch (err) {
    logError(err, { ip, apiKeyId: key.apiKeyId, note: "invalid payload" });
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  // 3. Provision (idempotent). The key's community is the target.
  try {
    const result = await provisionExternalMember({
      apiKeyId: key.apiKeyId,
      communityId: key.communityId,
      email: body.email,
      name: body.name,
      challengeSlug: body.challengeSlug,
      externalOrderId: body.externalOrderId,
    });

    // 4. Send magic-link login email — only for brand-new accounts, only once.
    if (result.userCreated && !result.alreadyProcessed) {
      try {
        await signIn("resend", { email: body.email.trim().toLowerCase(), redirect: false });
      } catch (err) {
        // Best-effort: account is already provisioned; don't fail the webhook.
        logger.warn(
          { err, apiKeyId: key.apiKeyId, userId: result.userId },
          "[external-member] magic link send failed"
        );
      }
    }

    // Echo externalOrderId for caller correlation — do NOT leak the internal userId.
    return NextResponse.json({
      ok: true,
      externalOrderId: body.externalOrderId,
      userCreated: result.userCreated,
      challengeJoined: result.challengeJoined,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (err) {
    // Domain errors → stable 4xx (caller should NOT retry); else 500.
    const msg = err instanceof Error ? err.message : "internal";
    if (msg === "challenge_not_found") {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
    if (msg === "community_inactive") {
      // Owner's plan is pending/expired — community is read-only. Retrying won't help.
      return NextResponse.json({ ok: false, error: msg }, { status: 409 });
    }
    logError(err, { ip, apiKeyId: key.apiKeyId });
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
