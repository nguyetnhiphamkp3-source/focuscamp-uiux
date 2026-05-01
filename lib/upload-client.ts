/**
 * Client-side upload helper — asks the server for a presigned POST policy,
 * then uploads the file as multipart/form-data. The policy enforces size
 * + content-type server-side, so a client cannot smuggle larger files than
 * the per-context cap.
 *
 * Usage:
 *   const url = await uploadImage(file, "avatar");
 */

export type UploadContext =
  | "avatar"
  | "community"
  | "post"
  | "checkin"
  | "product-file";

interface PresignResponse {
  uploadUrl: string;
  fields: Record<string, string>;
  publicUrl: string;
  maxSize: number;
}

export async function uploadImage(
  file: File,
  context: UploadContext,
): Promise<string> {
  let presignRes: Response;
  try {
    presignRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        context,
      }),
    });
  } catch {
    throw new Error("Không gọi được /api/upload (server lỗi?)");
  }

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.error || `presign_failed_${presignRes.status}`);
  }

  const { uploadUrl, fields, publicUrl, maxSize }: PresignResponse =
    await presignRes.json();

  // Early friendly error before sending bytes — server policy will reject too,
  // but this saves the round-trip + gives a localized message.
  if (file.size > maxSize) {
    throw new Error(
      `File quá lớn (tối đa ${Math.round(maxSize / 1024 / 1024)}MB)`,
    );
  }

  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("file", file); // must be the LAST field

  let postRes: Response;
  try {
    postRes = await fetch(uploadUrl, { method: "POST", body: form });
  } catch {
    throw new Error(
      "CORS block — vào Cloudflare R2 → bucket → Settings → CORS Policy, add POST từ focus.camp",
    );
  }

  if (!postRes.ok) {
    // 412 = policy condition (size/content-type) failed
    if (postRes.status === 412) {
      throw new Error(`File vượt giới hạn (${Math.round(maxSize / 1024 / 1024)}MB)`);
    }
    throw new Error(`R2 từ chối upload (HTTP ${postRes.status})`);
  }

  return publicUrl;
}
