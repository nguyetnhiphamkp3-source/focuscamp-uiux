/**
 * Seed 21 challenge tasks từ taip.io export → focus.camp DB
 *
 * Prerequisites:
 *   1. bash scripts/taip-export.sh   (tạo migration-data/tasks.json)
 *   2. Community "the-all-in-plan" phải tồn tại trong focus.camp DB
 *
 * Usage:
 *   pnpm tsx scripts/migrate-challenge.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, "migration-data");

interface TaipTask {
  day_number: number;
  title: string;
  description: string | null;
  label: string | null;
  sop_content: string | null;
  video_url: string | null;
  meeting_at: string | null;
  evidence_type: string;
  evidence_label: string | null;
}

interface TaipExpedition {
  id: number;
  title: string;
  description: string | null;
  difficulty: string;
  required_days: number;
  max_members: number;
  deposit_aip: number;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  slug: string | null;
  freeze_from_day: number | null;
  freeze_starts_at: string | null;
  freeze_ends_at: string | null;
}

function readJson<T>(filename: string): T {
  const fp = path.join(DATA_DIR, filename);
  if (!fs.existsSync(fp)) {
    console.error(`✗ Không tìm thấy file: ${fp}`);
    console.error("  Chạy trước: bash scripts/taip-export.sh");
    process.exit(1);
  }
  const raw = fs.readFileSync(fp, "utf-8").trim();
  if (!raw || raw === "null") return null as unknown as T;
  return JSON.parse(raw) as T;
}

async function main() {
  const expedition = readJson<TaipExpedition>("expedition.json");
  const tasks = readJson<TaipTask[]>("tasks.json") ?? [];

  if (!expedition) {
    console.error("✗ expedition.json rỗng");
    process.exit(1);
  }

  console.log(`📦 Loaded: "${expedition.title}" — ${tasks.length} tasks\n`);

  // Find community
  const community = await prisma.community.findUnique({
    where: { slug: "the-all-in-plan" },
  });
  if (!community) {
    console.error('✗ Community "the-all-in-plan" không tồn tại.');
    console.error("  Chạy: SEED_OWNER_EMAIL=your@email.com pnpm prisma db seed");
    process.exit(1);
  }
  console.log(`✓ Community: ${community.name}`);

  // Upsert Challenge
  const slug = expedition.slug ?? "the-all-in-plan-21";
  const challengeData = {
    communityId: community.id,
    slug,
    title: expedition.title,
    description: expedition.description,
    difficulty: expedition.difficulty.toUpperCase(),
    requiredDays: expedition.required_days,
    maxMembers: expedition.max_members,
    depositAip: expedition.deposit_aip,
    status: mapStatus(expedition.status),
    startsAt: expedition.starts_at ? new Date(expedition.starts_at) : null,
    endsAt: expedition.ends_at ? new Date(expedition.ends_at) : null,
    freezeFromDay: expedition.freeze_from_day,
    freezeStartsAt: expedition.freeze_starts_at ? new Date(expedition.freeze_starts_at) : null,
    freezeEndsAt: expedition.freeze_ends_at ? new Date(expedition.freeze_ends_at) : null,
  };

  const challenge = await prisma.challenge.upsert({
    where: { communityId_slug: { communityId: community.id, slug } },
    update: challengeData,
    create: challengeData,
  });
  console.log(`✓ Challenge upserted: "${challenge.title}" (${challenge.id})`);

  // Upsert 21 tasks
  let count = 0;
  for (const t of tasks) {
    const taskData = {
      challengeId: challenge.id,
      dayNumber: t.day_number,
      label: t.label,
      title: t.title,
      description: t.description,
      sopContent: t.sop_content,
      videoUrl: t.video_url,
      meetingAt: t.meeting_at ? new Date(t.meeting_at) : null,
      evidenceType: t.evidence_type.toUpperCase(),
      evidenceLabel: t.evidence_label,
    };
    await prisma.challengeTask.upsert({
      where: { challengeId_dayNumber: { challengeId: challenge.id, dayNumber: t.day_number } },
      update: taskData,
      create: taskData,
    });
    console.log(`  Day ${String(t.day_number).padStart(2, "0")} — ${t.title}`);
    count++;
  }

  console.log(`\n✅ ${count} tasks seeded vào community "${community.name}"`);
}

function mapStatus(s: string): string {
  const map: Record<string, string> = {
    open: "OPEN", active: "ACTIVE", completed: "COMPLETED",
    failed: "COMPLETED", cancelled: "CANCELLED", pending_approval: "OPEN",
  };
  return map[s] ?? "OPEN";
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
