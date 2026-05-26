import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deleteAIProvider,
  updateAIProvider,
} from "@/lib/services/ai-provider";
import { AIProviderUpdateSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await params;
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

  const parsed = AIProviderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "invalid" },
      { status: 400 },
    );
  }

  try {
    const provider = await updateAIProvider({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      providerId,
      data: {
        name: parsed.data.name,
        displayName: parsed.data.displayName,
        providerType: parsed.data.providerType,
        baseUrl: parsed.data.baseUrl,
        apiKey: parsed.data.apiKey,
        enabled: parsed.data.enabled,
      },
    });
    return NextResponse.json({ ok: true, provider });
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: parsed.data.communityId, providerId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await params;
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
    await deleteAIProvider({ userId: s.user.id, communityId, providerId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError(err, { userId: s.user.id, communityId, providerId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 400 },
    );
  }
}
