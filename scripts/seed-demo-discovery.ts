/**
 * Seed demo communities + challenges for Discovery page preview.
 * Run: npx tsx scripts/seed-demo-discovery.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FAR_FUTURE = new Date("2030-12-31");

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "dev@focus.camp";
  const owner = await prisma.user.findFirst({
    where: { email: { contains: ownerEmail } },
  });
  if (!owner) {
    console.error("❌ Owner not found. Run app once, login, then set SEED_OWNER_EMAIL.");
    process.exit(1);
  }
  console.log("✅ Owner:", owner.email);

  // ─── Activate + feature The All In Plan ────────────────────────────
  await prisma.community.update({
    where: { slug: "the-all-in-plan" },
    data: {
      featuredOnGlobal: true,
      planTier: "GRANDFATHER",
      planExpiresAt: FAR_FUTURE,
      memberCount: 247,
      tagline: "Cộng đồng builder — từ 0 đến sản phẩm đầu tiên",
    },
  });
  console.log("✅ Updated: the-all-in-plan");

  // ─── Demo communities ───────────────────────────────────────────────
  const DEMOS = [
    {
      slug: "coder-viet",
      name: "Coder Việt",
      tagline: "Cộng đồng lập trình viên Việt Nam — share code, học hỏi, grow together",
      bannerUrl: null,
      iconUrl: null,
      memberCount: 1820,
      featuredOnGlobal: true,
    },
    {
      slug: "content-creator-hub",
      name: "Content Creator Hub",
      tagline: "Sáng tạo nội dung — từ ý tưởng đến viral",
      bannerUrl: null,
      iconUrl: null,
      memberCount: 934,
      featuredOnGlobal: true,
    },
    {
      slug: "ecom-mastery",
      name: "Ecom Mastery",
      tagline: "Thương mại điện tử Việt — Shopee, TikTok Shop, dropship",
      bannerUrl: null,
      iconUrl: null,
      memberCount: 3211,
      featuredOnGlobal: false,
    },
    {
      slug: "mindset-lab",
      name: "Mindset Lab",
      tagline: "Tư duy — thói quen — hiệu suất cá nhân",
      bannerUrl: null,
      iconUrl: null,
      memberCount: 512,
      featuredOnGlobal: false,
    },
    {
      slug: "startup-vietnam",
      name: "Startup Vietnam",
      tagline: "Network founders & investors — từ ý tưởng đến funding",
      bannerUrl: null,
      iconUrl: null,
      memberCount: 688,
      featuredOnGlobal: false,
    },
  ];

  for (const demo of DEMOS) {
    await prisma.community.upsert({
      where: { slug: demo.slug },
      update: {
        featuredOnGlobal: demo.featuredOnGlobal,
        planTier: "GRANDFATHER",
        planExpiresAt: FAR_FUTURE,
        memberCount: demo.memberCount,
        tagline: demo.tagline,
      },
      create: {
        slug: demo.slug,
        name: demo.name,
        tagline: demo.tagline,
        bannerUrl: demo.bannerUrl,
        iconUrl: demo.iconUrl,
        ownerId: owner.id,
        memberCount: demo.memberCount,
        featuredOnGlobal: demo.featuredOnGlobal,
        planTier: "GRANDFATHER",
        planExpiresAt: FAR_FUTURE,
      },
    });
    console.log(`✅ Community: ${demo.name}`);
  }

  // ─── Feature the existing challenge + add demo challenges ──────────
  // Feature existing challenge
  await prisma.challenge.updateMany({
    where: { slug: "funnel-21-ngay" },
    data: { featuredOnGlobal: true },
  });

  // Get the All In Plan community id
  const aip = await prisma.community.findUnique({ where: { slug: "the-all-in-plan" } });
  const coderViet = await prisma.community.findUnique({ where: { slug: "coder-viet" } });
  const contentHub = await prisma.community.findUnique({ where: { slug: "content-creator-hub" } });

  const demoChallenges = [
    aip && {
      slug: "30-ngay-doc-sach",
      communityId: aip.id,
      title: "30 Ngày Đọc Sách",
      description: "Đọc ít nhất 10 trang mỗi ngày trong 30 ngày liên tiếp. Check-in daily với key takeaway.",
      difficulty: "NORMAL" as const,
      status: "ACTIVE" as const,
      featuredOnGlobal: true,
    },
    coderViet && {
      slug: "build-in-public-7-ngay",
      communityId: coderViet.id,
      title: "Build in Public — 7 Ngày Ship",
      description: "Ship 1 side project trong 7 ngày. Mỗi ngày post update về progress, blockers và lessons.",
      difficulty: "HARD" as const,
      status: "OPEN" as const,
      featuredOnGlobal: true,
    },
    contentHub && {
      slug: "30-post-30-ngay",
      communityId: contentHub.id,
      title: "30 Post · 30 Ngày",
      description: "Đăng 1 bài content mỗi ngày trong 30 ngày. Tăng reach và xây dựng thói quen tạo nội dung đều đặn.",
      difficulty: "NORMAL" as const,
      status: "ACTIVE" as const,
      featuredOnGlobal: true,
    },
  ].filter(Boolean) as {
    slug: string; communityId: string; title: string; description: string;
    difficulty: "NORMAL" | "HARD" | "CHAOS"; status: "ACTIVE" | "OPEN";
    featuredOnGlobal: boolean;
  }[];

  for (const ch of demoChallenges) {
    await prisma.challenge.upsert({
      where: { communityId_slug: { communityId: ch.communityId, slug: ch.slug } },
      update: { featuredOnGlobal: ch.featuredOnGlobal },
      create: {
        communityId: ch.communityId,
        slug: ch.slug,
        title: ch.title,
        description: ch.description,
        difficulty: ch.difficulty,
        status: ch.status,
        featuredOnGlobal: ch.featuredOnGlobal,
      },
    });
    console.log(`✅ Challenge: ${ch.title}`);
  }

  console.log("\n🎉 Discovery demo seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
