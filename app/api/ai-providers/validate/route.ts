import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  validateAIProvider,
  validateStoredAIProvider,
} from "@/lib/services/ai-provider";
import { AIProviderValidateSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit({
    key: `ai-provider-validate:${s.user.id}`,
    limit: 10,
    windowSec: 60,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = AIProviderValidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "invalid" },
      { status: 400 },
    );
  }

  try {
    const result = parsed.data.providerId
      ? await validateStoredAIProvider({
          userId: s.user.id,
          communityId: parsed.data.communityId,
          providerId: parsed.data.providerId,
          modelId: parsed.data.modelId,
        })
      : await validateAIProvider({
          providerType: parsed.data.providerType ?? "",
          baseUrl: parsed.data.baseUrl,
          apiKey: parsed.data.apiKey,
          modelId: parsed.data.modelId,
        });
    return NextResponse.json(result);
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: parsed.data.communityId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 400 },
    );
  }
}
