/**
 * Upload API — returns a presigned URL for direct client-to-S3 upload.
 *
 * POST /api/upload
 * Body: { fileName: string, contentType: string, context: "avatar" | "community" | "post" | "checkin" }
 *
 * Returns: { uploadUrl, publicUrl } or 503 if storage not configured.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPresignedUploadUrl, isStorageConfigured } from "@/lib/storage";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MAX_FILE_SIZES: Record<string, number> = {
  avatar: 2 * 1024 * 1024, // 2MB
  community: 5 * 1024 * 1024, // 5MB
  post: 10 * 1024 * 1024, // 10MB
  checkin: 10 * 1024 * 1024, // 10MB
};

type UploadContext = "avatar" | "community" | "post" | "checkin";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 uploads per minute per user
  const rl = await rateLimit({
    key: `upload:${session.user.id}`,
    limit: 10,
    windowSec: 60,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "storage_not_configured" },
      { status: 503 },
    );
  }

  let body: { fileName?: string; contentType?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { fileName, contentType, context } = body;
  if (!fileName || !contentType || !context) {
    return NextResponse.json(
      { error: "missing_fields" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "unsupported_type", allowed: [...ALLOWED_TYPES] },
      { status: 400 },
    );
  }

  if (!(context in MAX_FILE_SIZES)) {
    return NextResponse.json({ error: "invalid_context" }, { status: 400 });
  }

  // Generate unique key: context/userId/timestamp-random.ext
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `${context}/${session.user.id}/${ts}-${rand}.${ext}`;

  const result = await getPresignedUploadUrl({ key, contentType });
  if (!result) {
    return NextResponse.json(
      { error: "presign_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
    key,
    maxSize: MAX_FILE_SIZES[context as UploadContext],
  });
}
