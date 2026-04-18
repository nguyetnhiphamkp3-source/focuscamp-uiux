/**
 * Object storage abstraction — S3-compatible (AWS S3, Cloudflare R2, MinIO).
 *
 * Provides:
 *   - uploadFile: upload a buffer/stream directly
 *   - getPresignedUploadUrl: client-side direct upload (no server memory pressure)
 *   - getPublicUrl: construct the public CDN URL for a key
 *   - deleteFile: remove an object
 *
 * Falls back gracefully — if S3_ENDPOINT is not configured, all methods
 * return null so the app can run without object storage (upload features disabled).
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL; // CDN URL prefix
const S3_REGION = process.env.S3_REGION || "auto";

function createS3Client(): S3Client | null {
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    logger.warn("[storage] S3 not configured — file uploads disabled");
    return null;
  }
  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true, // needed for MinIO/R2
  });
}

const s3 = createS3Client();

export function isStorageConfigured(): boolean {
  return s3 !== null;
}

/**
 * Upload a file directly from the server.
 * Returns the public URL or null if storage is not configured.
 */
export async function uploadFile(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<string | null> {
  if (!s3 || !S3_BUCKET) return null;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return getPublicUrl(input.key);
  } catch (err) {
    logger.error({ err, key: input.key }, "[storage] upload failed");
    return null;
  }
}

/**
 * Get a presigned URL for client-side direct upload.
 * Client PUTs the file directly to S3 — no server memory pressure.
 */
export async function getPresignedUploadUrl(input: {
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 300 (5 min)
}): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  if (!s3 || !S3_BUCKET) return null;
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: input.key,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });
    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: input.expiresIn ?? 300,
    });
    return {
      uploadUrl,
      publicUrl: getPublicUrl(input.key)!,
    };
  } catch (err) {
    logger.error({ err, key: input.key }, "[storage] presign failed");
    return null;
  }
}

/**
 * Construct the public CDN URL for a storage key.
 */
export function getPublicUrl(key: string): string | null {
  if (!S3_PUBLIC_URL) return null;
  return `${S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(key: string): Promise<boolean> {
  if (!s3 || !S3_BUCKET) return false;
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch (err) {
    logger.error({ err, key }, "[storage] delete failed");
    return false;
  }
}
