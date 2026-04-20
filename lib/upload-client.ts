/**
 * Client-side upload helper — asks the server for a presigned URL, then PUTs
 * the file directly to R2/S3. Returns the public URL on success.
 *
 * Usage:
 *   const url = await uploadImage(file, "avatar");
 */

export type UploadContext = "avatar" | "community" | "post" | "checkin";

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

  const {
    uploadUrl,
    publicUrl,
    maxSize,
  }: { uploadUrl: string; publicUrl: string; maxSize: number } =
    await presignRes.json();

  if (file.size > maxSize) {
    throw new Error(
      `File quá lớn (tối đa ${Math.round(maxSize / 1024 / 1024)}MB)`,
    );
  }

  let putRes: Response;
  try {
    putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
  } catch {
    throw new Error(
      "CORS block — vào Cloudflare R2 → bucket → Settings → CORS Policy, add PUT từ focus.camp",
    );
  }

  if (!putRes.ok) {
    throw new Error(`R2 từ chối upload (HTTP ${putRes.status})`);
  }

  return publicUrl;
}
