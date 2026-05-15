/**
 * R2 orphan cleanup — lists all objects in the S3 bucket, compares against
 * URLs referenced in the database, and deletes orphaned files older than 24h.
 *
 * Run weekly via cron or manually:
 *   docker compose exec app npx tsx scripts/cleanup-r2-orphans.ts
 *
 * Add --dry-run to preview without deleting:
 *   docker compose exec app npx tsx scripts/cleanup-r2-orphans.ts --dry-run
 */
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const S3_ENDPOINT = process.env.S3_ENDPOINT!;
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY!;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL!;
const S3_REGION = process.env.S3_REGION || "auto";

const DRY_RUN = process.argv.includes("--dry-run");
const MIN_AGE_MS = 24 * 60 * 60 * 1000; // only delete files older than 24h

async function getAllR2Keys(s3: S3Client): Promise<{ key: string; lastModified: Date }[]> {
  const results: { key: string; lastModified: Date }[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.LastModified) {
        results.push({ key: obj.Key, lastModified: obj.LastModified });
      }
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return results;
}

async function getReferencedUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  const prefix = S3_PUBLIC_URL.replace(/\/$/, "") + "/";

  const extract = (url: string | null) => {
    if (url && url.startsWith(prefix)) urls.add(url.slice(prefix.length));
  };

  const [users, communities, challenges, checkins, posts, products, events] =
    await Promise.all([
      prisma.user.findMany({ where: { image: { startsWith: prefix } }, select: { image: true } }),
      prisma.community.findMany({
        where: { OR: [{ bannerUrl: { startsWith: prefix } }, { iconUrl: { startsWith: prefix } }] },
        select: { bannerUrl: true, iconUrl: true },
      }),
      prisma.challenge.findMany({ where: { bannerUrl: { startsWith: prefix } }, select: { bannerUrl: true } }),
      prisma.checkin.findMany({ where: { imageUrl: { startsWith: prefix } }, select: { imageUrl: true } }),
      prisma.post.findMany({ where: { imageUrl: { startsWith: prefix } }, select: { imageUrl: true } }),
      prisma.product.findMany({
        where: { OR: [{ fileUrl: { startsWith: prefix } }, { thumbnailUrl: { startsWith: prefix } }] },
        select: { fileUrl: true, thumbnailUrl: true },
      }),
      prisma.event.findMany({ where: { bannerUrl: { startsWith: prefix } }, select: { bannerUrl: true } }),
    ]);

  users.forEach((r) => extract(r.image));
  communities.forEach((r) => { extract(r.bannerUrl); extract(r.iconUrl); });
  challenges.forEach((r) => extract(r.bannerUrl));
  checkins.forEach((r) => extract(r.imageUrl));
  posts.forEach((r) => extract(r.imageUrl));
  products.forEach((r) => { extract(r.fileUrl); extract(r.thumbnailUrl); });
  events.forEach((r) => extract(r.bannerUrl));

  return urls;
}

async function main() {
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_PUBLIC_URL) {
    logger.error("[cleanup-r2] Missing S3 env vars");
    process.exit(1);
  }

  const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    forcePathStyle: true,
  });

  logger.info("[cleanup-r2] Listing R2 objects...");
  const allObjects = await getAllR2Keys(s3);
  logger.info(`[cleanup-r2] Found ${allObjects.length} objects in R2`);

  logger.info("[cleanup-r2] Querying DB for referenced URLs...");
  const referenced = await getReferencedUrls();
  logger.info(`[cleanup-r2] Found ${referenced.size} referenced keys in DB`);

  const now = Date.now();
  const orphans = allObjects.filter(
    (obj) => !referenced.has(obj.key) && now - obj.lastModified.getTime() > MIN_AGE_MS
  );

  logger.info(`[cleanup-r2] Found ${orphans.length} orphaned objects (>24h old)`);

  if (orphans.length === 0) {
    logger.info("[cleanup-r2] Nothing to clean up");
    await prisma.$disconnect();
    return;
  }

  if (DRY_RUN) {
    logger.info("[cleanup-r2] DRY RUN — would delete:");
    for (const o of orphans.slice(0, 20)) {
      logger.info(`  ${o.key} (${o.lastModified.toISOString()})`);
    }
    if (orphans.length > 20) logger.info(`  ... and ${orphans.length - 20} more`);
    await prisma.$disconnect();
    return;
  }

  // Delete in batches of 1000 (S3 limit)
  const BATCH_SIZE = 1000;
  let deleted = 0;
  for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
    const batch = orphans.slice(i, i + BATCH_SIZE);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: batch.map((o) => ({ Key: o.key })) },
      })
    );
    deleted += batch.length;
    logger.info(`[cleanup-r2] Deleted ${deleted}/${orphans.length}`);
  }

  logger.info(`[cleanup-r2] Done — deleted ${deleted} orphaned files`);
  await prisma.$disconnect();
}

main().catch((err) => {
  logger.error(err, "[cleanup-r2] Fatal error");
  process.exit(1);
});
