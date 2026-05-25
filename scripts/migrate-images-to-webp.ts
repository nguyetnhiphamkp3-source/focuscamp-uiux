/**
 * Migrate legacy community icon/banner images to webp.
 *
 * Scans Community.iconUrl + Community.bannerUrl. For each R2 URL that is
 * jpg/jpeg/png/avif, downloads → converts via sharp → re-uploads as .webp
 * → updates DB → deletes the original.
 *
 * Files uploaded before commit 8366440 (2026-05-16) bypassed the convert
 * step in /api/upload because that logic did not exist yet.
 *
 * Run:
 *   pnpm tsx scripts/migrate-images-to-webp.ts            # apply changes
 *   pnpm tsx scripts/migrate-images-to-webp.ts --dry-run  # preview only
 */
import { randomBytes } from "crypto";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const S3_ENDPOINT = process.env.S3_ENDPOINT!;
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY!;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL!;
const S3_REGION = process.env.S3_REGION || "auto";

const DRY_RUN = process.argv.includes("--dry-run");
const CONVERTIBLE_EXT = new Set(["jpg", "jpeg", "png", "avif"]);

type Target = {
  communityId: string;
  slug: string;
  field: "iconUrl" | "bannerUrl";
  url: string;
};

function getExt(url: string): string | null {
  const m = url.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  return m ? m[1].toLowerCase() : null;
}

function keyFromPublicUrl(url: string): string | null {
  const prefix = S3_PUBLIC_URL.replace(/\/$/, "") + "/";
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

async function main() {
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_PUBLIC_URL) {
    logger.error("[migrate-webp] storage env not configured");
    process.exit(1);
  }

  const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    forcePathStyle: true,
  });

  const rows = await prisma.community.findMany({
    select: { id: true, slug: true, iconUrl: true, bannerUrl: true },
  });

  const targets: Target[] = [];
  for (const r of rows) {
    for (const field of ["iconUrl", "bannerUrl"] as const) {
      const url = r[field];
      if (!url) continue;
      const ext = getExt(url);
      if (!ext || !CONVERTIBLE_EXT.has(ext)) continue;
      if (!keyFromPublicUrl(url)) continue; // skip non-R2 URLs
      targets.push({ communityId: r.id, slug: r.slug, field, url });
    }
  }

  logger.info(
    `[migrate-webp] scanned ${rows.length} communities → ${targets.length} legacy images${DRY_RUN ? " (dry-run)" : ""}`,
  );

  let ok = 0;
  let fail = 0;

  for (const t of targets) {
    const oldKey = keyFromPublicUrl(t.url)!;
    const dir = oldKey.split("/").slice(0, -1).join("/");
    const newKey = `${dir}/${Date.now()}-${randomBytes(3).toString("hex")}.webp`;
    const log = `[${t.slug}/${t.field}] ${oldKey} → ${newKey}`;

    if (DRY_RUN) {
      logger.info(log);
      ok++;
      continue;
    }

    try {
      const obj = await s3.send(
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: oldKey }),
      );
      if (!obj.Body) throw new Error("empty body");
      const srcBuf = await streamToBuffer(obj.Body as NodeJS.ReadableStream);

      const webpBuf = await sharp(srcBuf).webp({ quality: 80 }).toBuffer();

      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: newKey,
          Body: webpBuf,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      const newUrl = `${S3_PUBLIC_URL.replace(/\/$/, "")}/${newKey}`;
      await prisma.community.update({
        where: { id: t.communityId },
        data: { [t.field]: newUrl },
      });

      await s3.send(
        new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: oldKey }),
      );

      logger.info(`${log} OK (${srcBuf.length}B → ${webpBuf.length}B)`);
      ok++;
    } catch (err) {
      logger.error({ err, target: t }, `${log} FAILED`);
      fail++;
    }
  }

  logger.info(`[migrate-webp] done. ok=${ok} fail=${fail}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  logger.error({ err }, "[migrate-webp] fatal");
  process.exit(1);
});
