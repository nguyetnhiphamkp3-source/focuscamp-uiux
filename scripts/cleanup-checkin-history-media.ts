/**
 * Challenge rejected-attempt media cleanup.
 *
 * Removes R2 evidence images stored only in Checkin.reviewHistory after a
 * retention window, then clears those URLs from the JSON history so the UI does
 * not render broken images. Text/link/review notes remain as the audit trail.
 *
 * Usage:
 *   docker compose exec app npx tsx scripts/cleanup-checkin-history-media.ts --dry-run
 *   docker compose exec app npx tsx scripts/cleanup-checkin-history-media.ts --days=30
 */
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const S3_ENDPOINT = process.env.S3_ENDPOINT!;
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY!;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL!;
const S3_REGION = process.env.S3_REGION || "auto";

const DRY_RUN = process.argv.includes("--dry-run");
const DEFAULT_RETENTION_DAYS = 30;
const BATCH_SIZE = 500;

type JsonObject = Record<string, unknown>;

function retentionDays(): number {
  const arg = process.argv.find((v) => v.startsWith("--days="));
  const days = arg ? Number(arg.slice("--days=".length)) : DEFAULT_RETENTION_DAYS;
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
}

function keyFromUrl(url: string): string | null {
  const prefix = S3_PUBLIC_URL.replace(/\/$/, "") + "/";
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}

function urlFromKey(key: string): string {
  return `${S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

function rejectedAtMs(entry: JsonObject): number | null {
  const raw =
    typeof entry.rejectedAt === "string"
      ? entry.rejectedAt
      : typeof entry.reviewedAt === "string"
        ? entry.reviewedAt
        : null;
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

function pruneHistoryImages(
  raw: unknown,
  cutoffMs: number,
  prunedAt: string,
): { next: Prisma.InputJsonValue | null; keys: string[]; entriesPruned: number; urlsPruned: number } {
  if (!Array.isArray(raw)) return { next: null, keys: [], entriesPruned: 0, urlsPruned: 0 };

  let changed = false;
  let entriesPruned = 0;
  let urlsPruned = 0;
  const keys = new Set<string>();

  const next = raw.map((item) => {
    if (!item || typeof item !== "object") return item;
    const entry = item as JsonObject;
    const imageUrls = Array.isArray(entry.imageUrls)
      ? entry.imageUrls.filter((url): url is string => typeof url === "string")
      : [];
    if (imageUrls.length === 0) return item;

    const ts = rejectedAtMs(entry);
    if (ts === null || ts >= cutoffMs) return item;

    const keptUrls: string[] = [];
    let removedFromEntry = 0;
    for (const url of imageUrls) {
      const key = keyFromUrl(url);
      if (!key) {
        keptUrls.push(url);
        continue;
      }
      keys.add(key);
      removedFromEntry += 1;
    }
    if (removedFromEntry === 0) return item;

    changed = true;
    entriesPruned += 1;
    urlsPruned += removedFromEntry;
    return {
      ...entry,
      imageUrls: keptUrls,
      imageUrlsPrunedAt: entry.imageUrlsPrunedAt ?? prunedAt,
    };
  });

  return {
    next: changed ? (next as Prisma.InputJsonValue) : null,
    keys: [...keys],
    entriesPruned,
    urlsPruned,
  };
}

async function deleteKeys(s3: S3Client, keys: string[]) {
  const unique = [...new Set(keys)];
  const batchSize = 1000;
  let deleted = 0;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: batch.map((key) => ({ Key: key })) },
      }),
    );
    deleted += batch.length;
    logger.info(`[cleanup-checkin-history-media] Deleted ${deleted}/${unique.length}`);
  }
}

async function getStillReferencedKeys(keys: string[]): Promise<Set<string>> {
  const uniqueKeys = [...new Set(keys)];
  const candidateUrls = new Set(uniqueKeys.map(urlFromKey));
  const stillReferenced = new Set<string>();
  const extract = (url: string | null | undefined) => {
    if (!url || !candidateUrls.has(url)) return;
    const key = keyFromUrl(url);
    if (key) stillReferenced.add(key);
  };
  const extractMany = (raw: unknown) => {
    if (!Array.isArray(raw)) return;
    raw.forEach((url) => {
      if (typeof url === "string") extract(url);
    });
  };
  const extractCheckinHistory = (raw: unknown) => {
    if (!Array.isArray(raw)) return;
    raw.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      extractMany((entry as JsonObject).imageUrls);
    });
  };

  const [users, communities, courses, challenges, challengeTasks, checkins, posts, products, events] =
    await Promise.all([
      prisma.user.findMany({ select: { image: true } }),
      prisma.community.findMany({ select: { bannerUrl: true, iconUrl: true, agentAvatarUrl: true } }),
      prisma.course.findMany({ select: { thumbnailUrl: true } }),
      prisma.challenge.findMany({ select: { bannerUrl: true } }),
      prisma.challengeTask.findMany({ select: { giftFileUrl: true } }),
      prisma.checkin.findMany({ select: { imageUrl: true, imageUrls: true, reviewHistory: true } }),
      prisma.post.findMany({ select: { imageUrl: true } }),
      prisma.product.findMany({ select: { fileUrl: true, thumbnailUrl: true } }),
      prisma.event.findMany({ select: { bannerUrl: true } }),
    ]);

  users.forEach((r) => extract(r.image));
  communities.forEach((r) => { extract(r.bannerUrl); extract(r.iconUrl); extract(r.agentAvatarUrl); });
  courses.forEach((r) => extract(r.thumbnailUrl));
  challenges.forEach((r) => extract(r.bannerUrl));
  challengeTasks.forEach((r) => extract(r.giftFileUrl));
  checkins.forEach((r) => {
    extract(r.imageUrl);
    extractMany(r.imageUrls);
    extractCheckinHistory(r.reviewHistory);
  });
  posts.forEach((r) => extract(r.imageUrl));
  products.forEach((r) => { extract(r.fileUrl); extract(r.thumbnailUrl); });
  events.forEach((r) => extract(r.bannerUrl));

  return stillReferenced;
}

async function main() {
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_PUBLIC_URL) {
    logger.error("[cleanup-checkin-history-media] Missing S3 env vars");
    process.exit(1);
  }

  const days = retentionDays();
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const prunedAt = new Date().toISOString();
  const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    forcePathStyle: true,
  });

  let scanned = 0;
  let rowsChanged = 0;
  let entriesPruned = 0;
  let urlsPruned = 0;
  const keysToDelete: string[] = [];
  let cursor: string | undefined;

  for (;;) {
    const checkins = await prisma.checkin.findMany({
      where: { NOT: [{ reviewHistory: { equals: Prisma.DbNull } }] },
      select: { id: true, reviewHistory: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (checkins.length === 0) break;
    scanned += checkins.length;
    const updates: { id: string; reviewHistory: Prisma.InputJsonValue }[] = [];

    for (const checkin of checkins) {
      const pruned = pruneHistoryImages(checkin.reviewHistory, cutoffMs, prunedAt);
      if (!pruned.next) continue;
      rowsChanged += 1;
      entriesPruned += pruned.entriesPruned;
      urlsPruned += pruned.urlsPruned;
      keysToDelete.push(...pruned.keys);
      updates.push({ id: checkin.id, reviewHistory: pruned.next });
    }
    if (!DRY_RUN) {
      for (const update of updates) {
        await prisma.checkin.update({
          where: { id: update.id },
          data: { reviewHistory: update.reviewHistory },
        });
      }
    }

    cursor = checkins[checkins.length - 1]?.id;
    if (checkins.length < BATCH_SIZE) break;
  }

  const summary = {
    dryRun: DRY_RUN,
    retentionDays: days,
    scanned,
    rowsChanged,
    entriesPruned,
    urlsPruned,
    objectsToDelete: new Set(keysToDelete).size,
  };
  logger.info(summary, "[cleanup-checkin-history-media] scan complete");

  if (DRY_RUN || keysToDelete.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const stillReferenced = await getStillReferencedKeys(keysToDelete);
  const safeToDelete = [...new Set(keysToDelete)].filter((key) => !stillReferenced.has(key));
  if (stillReferenced.size > 0) {
    logger.info(
      { stillReferenced: stillReferenced.size, safeToDelete: safeToDelete.length },
      "[cleanup-checkin-history-media] skipped keys still referenced elsewhere",
    );
  }
  await deleteKeys(s3, safeToDelete);
  logger.info({ ...summary, deletedObjects: safeToDelete.length }, "[cleanup-checkin-history-media] done");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  logger.error(err, "[cleanup-checkin-history-media] fatal error");
  await prisma.$disconnect();
  process.exit(1);
});
