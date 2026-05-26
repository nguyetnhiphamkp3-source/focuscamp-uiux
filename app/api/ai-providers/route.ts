import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createAIProvider,
  listAIProviders,
} from "@/lib/services/ai-provider";
import { AIProviderCreateSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const communityId = url.searchParams.get("communityId");
  if (!communityId) {
    return NextResponse.json({ ok: false, error: "missing_community" }, { status: 400 });
  }

  try {
    const providers = await listAIProviders(s.user.id, communityId);
    return NextResponse.json({ ok: true, providers });
  } catch (err) {
    logError(err, { userId: s.user.id, communityId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 403 },
    );
  }
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = AIProviderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "invalid" },
      { status: 400 },
    );
  }

  try {
    const provider = await createAIProvider({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      name: parsed.data.name || parsed.data.displayName,
      displayName: parsed.data.displayName,
      providerType: parsed.data.providerType,
      baseUrl: parsed.data.baseUrl,
      apiKey: parsed.data.apiKey,
      enabled: parsed.data.enabled,
    });
    return NextResponse.json({ ok: true, provider });
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: parsed.data.communityId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 400 },
    );
  }
}
