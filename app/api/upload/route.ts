/**
 * Upload API — receives file as multipart FormData, uploads to R2 server-side.
 * Server-side upload avoids browser CORS restrictions with direct R2 access.
 *
 * POST /api/upload
 * Body: FormData { file: File, context: string }
 *
 * Returns: { publicUrl, key } or error response.
 */
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  uploadFile,
  isStorageConfigured,
  keyFromPublicUrl,
  deleteFile,
} from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const FILE_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "text/plain",
  "text/csv",
  "text/markdown",
]);

const MAX_FILE_SIZES: Record<string, number> = {
  avatar: 2 * 1024 * 1024,
  community: 5 * 1024 * 1024,
  post: 10 * 1024 * 1024,
  checkin: 10 * 1024 * 1024,
  "product-file": 200 * 1024 * 1024,
};

type UploadContext =
  | "avatar"
  | "community"
  | "post"
  | "checkin"
  | "product-file";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = formData.get("file");
  const context = formData.get("context");

  if (
    !file ||
    !(file instanceof File) ||
    !context ||
    typeof context !== "string"
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (!(context in MAX_FILE_SIZES)) {
    return NextResponse.json({ error: "invalid_context" }, { status: 400 });
  }

  const fileAllowed = context === "product-file";
  const allowedSet = fileAllowed
    ? new Set([...IMAGE_TYPES, ...FILE_TYPES])
    : IMAGE_TYPES;
  if (!allowedSet.has(file.type)) {
    return NextResponse.json(
      { error: "unsupported_type", allowed: [...allowedSet] },
      { status: 400 },
    );
  }

  const maxSize = MAX_FILE_SIZES[context as UploadContext];
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File quá lớn (tối đa ${Math.round(maxSize / 1024 / 1024)}MB)` },
      { status: 413 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const ts = Date.now();
  const rand = randomBytes(3).toString("hex");
  const key = `${context}/${session.user.id}/${ts}-${rand}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = await uploadFile({ key, body: buffer, contentType: file.type });

  if (!publicUrl) {
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  return NextResponse.json({ publicUrl, key });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const publicUrl =
    body && typeof body === "object" && "publicUrl" in body
      ? (body as { publicUrl?: unknown }).publicUrl
      : null;
  if (typeof publicUrl !== "string") {
    return NextResponse.json({ error: "missing_public_url" }, { status: 400 });
  }

  const key = keyFromPublicUrl(publicUrl);
  if (!key) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const [context, ownerId] = key.split("/");
  if (!(context in MAX_FILE_SIZES) || ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await deleteFile(key);
  return NextResponse.json({ ok: true });
}
