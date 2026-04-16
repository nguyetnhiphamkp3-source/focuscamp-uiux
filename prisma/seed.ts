import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check if owner exists; otherwise skip (requires a user to own the community)
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  if (!ownerEmail) {
    console.log(
      "⚠️  SEED_OWNER_EMAIL chưa set — seed bỏ qua. Login 1 lần qua Google rồi set email bạn vào .env làm owner."
    );
    return;
  }

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    console.log(`⚠️  Không tìm thấy user với email ${ownerEmail}. Login qua Google trước.`);
    return;
  }

  console.log(`✅ Found owner: ${owner.email}`);

  // Create The All In Plan community
  const community = await prisma.community.upsert({
    where: { slug: "the-all-in-plan" },
    update: {},
    create: {
      slug: "the-all-in-plan",
      name: "The All In Plan",
      tagline: "A premium community for builders, developers & creators",
      description:
        "Level up your skills with e-learning courses, weekly challenges, a curated marketplace, and a supportive community of builders shipping real products.",
      bannerUrl: "/campfire.jpg",
      iconUrl: null,
      ownerId: owner.id,
      classesConfig: [
        { slug: "engineer", name: "Engineer", emoji: "⚔️", color: "#5865F2", xpBonus: 1.0 },
        { slug: "marketer", name: "Marketer", emoji: "🎨", color: "#eb459e", xpBonus: 1.0 },
        { slug: "operator", name: "Operator", emoji: "🛡️", color: "#23a55a", xpBonus: 1.0 },
        { slug: "strategist", name: "Strategist", emoji: "🧠", color: "#9b59b6", xpBonus: 1.0 },
        { slug: "hustler", name: "Hustler", emoji: "🎯", color: "#e67e22", xpBonus: 1.0 },
      ],
      pillarsConfig: [
        { slug: "offer", name: "Offer", emoji: "🎯", color: "#c77a2d" },
        { slug: "traffic", name: "Traffic", emoji: "📣", color: "#5b7ba3" },
        { slug: "conversion", name: "Conversion", emoji: "⚡", color: "#7a9a5c" },
        { slug: "delivery", name: "Delivery", emoji: "🚚", color: "#9b6ba3" },
        { slug: "continuity", name: "Continuity", emoji: "🔄", color: "#a3905b" },
      ],
      gemsConfig: { name: "Đá Không Cực", emoji: "💎", rarity: "legendary" },
      billingModel: {
        plans: [
          { tier: "EXPLORER", name: "Explorer", priceVnd: 0, duration: "forever" },
          { tier: "BUILDER", name: "Builder", priceVnd: 990000, duration: "year" },
          { tier: "MASTER", name: "Master", priceVnd: 2490000, duration: "year" },
        ],
      },
      memberCount: 1,
    },
  });

  console.log(`✅ Community: ${community.name} (${community.slug})`);

  // Membership for owner
  await prisma.membership.upsert({
    where: {
      userId_communityId: { userId: owner.id, communityId: community.id },
    },
    update: {},
    create: {
      userId: owner.id,
      communityId: community.id,
      role: "OWNER",
      tier: "MASTER",
      className: "hustler",
      xp: 2450,
      level: 24,
      aip: 1420,
      gems: 3,
      streakDays: 7,
    },
  });

  console.log(`✅ Owner membership created`);

  // Create channels
  const channels = [
    { slug: "welcome", name: "👋welcome", category: "PUBLIC", position: 0 },
    { slug: "tips-and-news", name: "🏷tips-and-news", category: "PUBLIC", position: 1 },
    { slug: "discussion-vn", name: "discussion-🇻🇳", category: "PUBLIC", position: 2 },
    { slug: "discussion-en", name: "discussion-en", category: "PUBLIC", position: 3 },
    { slug: "off-topic", name: "off-topic", category: "PUBLIC", position: 4, topic: "Tâm sự linh tinh" },
    { slug: "rules", name: "rules", category: "THÔNG TIN", position: -2 },
    { slug: "announcement", name: "announcement", category: "THÔNG TIN", position: -1 },
  ];

  for (const ch of channels) {
    await prisma.channel.upsert({
      where: { communityId_slug: { communityId: community.id, slug: ch.slug } },
      update: {},
      create: { ...ch, communityId: community.id },
    });
  }
  console.log(`✅ ${channels.length} channels created`);

  // Create sample course
  const course = await prisma.course.upsert({
    where: { communityId_slug: { communityId: community.id, slug: "foundations" } },
    update: {},
    create: {
      communityId: community.id,
      slug: "foundations",
      title: "Foundations — Sales Funnel Basics",
      description:
        "Học cách dựng luồng bán hàng end-to-end: từ traffic, landing page, form đăng ký, email nurture đến chốt deal.",
      pillar: "offer",
      level: "BASIC",
      xpReward: 300,
      isPublished: true,
    },
  });

  // Lessons
  const lessons = [
    { title: "Bài 1: Khái niệm Offer — Hiểu đúng trước khi bán", duration: 384, position: 0, xpReward: 50 },
    { title: "Bài 2: Tìm audience — ai là người mua của bạn", duration: 311, position: 1, xpReward: 50 },
    { title: "Bài 3: Xây dựng luồng bán hàng cơ bản", duration: 765, position: 2, xpReward: 50 },
    { title: "Bài 4: Landing page converted — template & wireframe", duration: 464, position: 3, xpReward: 50 },
    { title: "Bài 5: Email nurture sequence cho khách hàng mới", duration: 236, position: 4, xpReward: 50 },
  ];
  for (const lesson of lessons) {
    const exists = await prisma.lesson.findFirst({
      where: { courseId: course.id, position: lesson.position },
    });
    if (!exists) {
      await prisma.lesson.create({ data: { ...lesson, courseId: course.id } });
    }
  }
  console.log(`✅ Course "${course.title}" + ${lessons.length} lessons`);

  // Sample challenge
  const challenge = await prisma.challenge.upsert({
    where: { communityId_slug: { communityId: community.id, slug: "funnel-21" } },
    update: {},
    create: {
      communityId: community.id,
      slug: "funnel-21",
      title: "Funnel 21 ngày — từ traffic đến sale",
      description:
        "Dựng hoàn chỉnh một luồng bán hàng trong 21 ngày, mỗi ngày một task có SOP và review từ mentor.",
      difficulty: "HARD",
      requiredDays: 21,
      maxMembers: 50,
      depositAip: 200,
      status: "ACTIVE",
      leaderId: owner.id,
    },
  });
  console.log(`✅ Challenge "${challenge.title}"`);

  // Sample products for marketplace
  const products = [
    {
      slug: "funnel-template-pack",
      title: "Funnel Template Pack",
      description: "Bộ template funnel chuẩn, convert cao, sẵn sàng customize cho mọi niche.",
      type: "TEMPLATE",
      pillar: "Offer · Phase 1",
      priceVnd: 290000,
      priceOldVnd: 490000,
    },
    {
      slug: "ai-challenge-coach",
      title: "AI Challenge Coach 24/7",
      description: "Bot AI đồng hành suốt thử thách — nhắc task, review, feedback. Telegram bridge.",
      type: "TOOL",
      pillar: "USP · All Pillars",
      priceVnd: 299000,
      isSubscription: true,
      subscriptionPeriod: "month",
    },
    {
      slug: "starter-bundle",
      title: "Beginner Starter Bundle",
      description: "Combo 6 items cho 4 challenge đầu: templates, SOP, prompts, tracker.",
      type: "BUNDLE",
      pillar: "6 items combo",
      priceVnd: 990000,
      priceOldVnd: 2200000,
    },
    {
      slug: "hiring-playbook",
      title: "Hiring Playbook",
      description: "SOP tuyển dụng scale team từ 5 đến 50 người. Template JD, interview, onboarding.",
      type: "SOP",
      pillar: "Delivery · Phase 3",
      priceVnd: 1490000,
    },
    {
      slug: "conversion-tracker",
      title: "Conversion Tracker",
      description: "Công cụ tracking tỷ lệ chuyển đổi funnel, A/B test, phân tích drop-off.",
      type: "TOOL",
      pillar: "Conversion",
      priceVnd: 790000,
    },
    {
      slug: "launch-prompt-pack",
      title: "Launch Prompt Pack",
      description: "50+ prompt chuẩn cho ChatGPT/Claude, phục vụ launch sản phẩm mới.",
      type: "PROMPT",
      pillar: "Launch",
      priceVnd: 0,
      isFree: true,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { communityId_slug: { communityId: community.id, slug: p.slug } },
      update: {},
      create: { ...p, communityId: community.id },
    });
  }
  console.log(`✅ Seeded ${products.length} products`);

  // Link products to the sample challenge as "equipment"
  const createdProducts = await prisma.product.findMany({
    where: { communityId: community.id },
  });
  const helperLinks = [
    { productSlug: "funnel-template-pack", relevance: "REQUIRED" },
    { productSlug: "ai-challenge-coach", relevance: "RECOMMENDED" },
    { productSlug: "conversion-tracker", relevance: "OPTIONAL" },
  ];
  for (const link of helperLinks) {
    const product = createdProducts.find((p) => p.slug === link.productSlug);
    if (!product) continue;
    await prisma.challengeProduct.upsert({
      where: {
        challengeId_productId: {
          challengeId: challenge.id,
          productId: product.id,
        },
      },
      update: {},
      create: {
        challengeId: challenge.id,
        productId: product.id,
        relevance: link.relevance,
      },
    });
  }
  console.log(`✅ Seeded ${helperLinks.length} challenge↔product links`);

  console.log("🎉 Seed done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
