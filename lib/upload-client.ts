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
  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      context,
    }),
  });

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

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`upload_failed_${putRes.status}`);
  }

  return publicUrl;
}
