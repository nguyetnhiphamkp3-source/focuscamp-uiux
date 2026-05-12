/**
 * Client-side upload helper — sends file directly to our API server,
 * which proxies the upload to R2. This avoids browser CORS issues with
 * direct browser-to-R2 uploads.
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

const MAX_FILE_SIZES: Record<UploadContext, number> = {
  avatar: 2 * 1024 * 1024,
  community: 5 * 1024 * 1024,
  post: 10 * 1024 * 1024,
  checkin: 10 * 1024 * 1024,
  "product-file": 200 * 1024 * 1024,
};

export async function uploadImage(
  file: File,
  context: UploadContext,
): Promise<string> {
  const maxSize = MAX_FILE_SIZES[context];
  if (file.size > maxSize) {
    throw new Error(
      `File quá lớn (tối đa ${Math.round(maxSize / 1024 / 1024)}MB)`,
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("context", context);

  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body: form });
  } catch {
    throw new Error("Không gọi được /api/upload (server lỗi?)");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `upload_failed_${res.status}`);
  }

  const { publicUrl } = await res.json();
  return publicUrl;
}
