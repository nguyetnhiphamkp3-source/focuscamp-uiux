/**
 * Local dev helper — seed extra communities and join the dev user to them,
 * so the left "community list" sidebar is populated and you can see the
 * joined-state UI + admin panels.
 *
 * Usage: pnpm exec tsx scripts/dev-join-communities.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXTRA = [
  {
    slug: "growth-lab",
    name: "Growth Lab",
    tagline: "Marketing & growth experiments cho founder",
    description: "Cộng đồng tăng trưởng: SEO, paid ads, funnel teardown hằng tuần.",
    bannerUrl: "/campfire.jpg",
    category: "Marketing",
    role: "ADMIN", // dev user is admin here
  },
  {
    slug: "design-guild",
    name: "Design Guild",
    tagline: "Product & UI/UX design crit",
    description: "Nơi designer review portfolio, chia sẻ system, mock interview.",
    bannerUrl: "/campfire.jpg",
    category: "Design",
    role: "MOD",
  },
  {
    slug: "indie-hackers-vn",
    name: "Indie Hackers VN",
    tagline: "Build in public — ship sản phẩm nhỏ ra tiền",
    description: "Cộng đồng indie maker Việt Nam, MRR challenge, accountability.",
    bannerUrl: "/campfire.jpg",
    category: "Startup",
    role: "MEMBER",
  },
];

async function main() {
  const devEmail = process.env.SEED_OWNER_EMAIL || "dev@focus.camp";
  const dev = await prisma.user.findUnique({ where: { email: devEmail } });
  if (!dev) throw new Error(`Dev user ${devEmail} not found — run dev-login.ts first`);

  for (const c of EXTRA) {
    // Each extra community owned by its own dummy owner (not the dev user)
    const owner = await prisma.user.upsert({
      where: { email: `owner-${c.slug}@focus.camp` },
      update: {},
      create: {
        email: `owner-${c.slug}@focus.camp`,
        name: `${c.name} Owner`,
        handle: `owner_${c.slug.replace(/-/g, "_")}`,
        emailVerified: new Date(),
      },
    });

    const community = await prisma.community.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        bannerUrl: c.bannerUrl,
        category: c.category,
        featuredOnGlobal: true,
        ownerId: owner.id,
        billingModel: {
          plans: [
            { tier: "EXPLORER", name: "Explorer", priceVnd: 0, duration: "forever" },
            { tier: "BUILDER", name: "Builder", priceVnd: 490000, duration: "year" },
          ],
        },
        memberCount: 2,
      },
    });

    // owner membership
    await prisma.membership.upsert({
      where: { userId_communityId: { userId: owner.id, communityId: community.id } },
      update: {},
      create: { userId: owner.id, communityId: community.id, role: "OWNER", tier: "MASTER" },
    });

    // dev user joins
    await prisma.membership.upsert({
      where: { userId_communityId: { userId: dev.id, communityId: community.id } },
      update: { role: c.role },
      create: {
        userId: dev.id,
        communityId: community.id,
        role: c.role,
        tier: "BUILDER",
        xp: 320,
        level: 4,
        aip: 80,
        gems: 1,
        streakDays: 2,
      },
    });

    // a couple default channels so the community is browsable
    for (const ch of [
      { slug: "welcome", name: "👋welcome", category: "PUBLIC", position: 0 },
      { slug: "general", name: "general", category: "PUBLIC", position: 1 },
    ]) {
      await prisma.channel.upsert({
        where: { communityId_slug: { communityId: community.id, slug: ch.slug } },
        update: {},
        create: { ...ch, communityId: community.id },
      });
    }

    console.log(`✅ ${c.name} (${c.slug}) — dev user joined as ${c.role}`);
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: dev.id },
    include: { community: { select: { name: true, slug: true } } },
  });
  console.log(`\n🎉 Dev user now in ${memberships.length} communities:`);
  for (const m of memberships) {
    console.log(`   - ${m.community.name} (/c/${m.community.slug}) — ${m.role}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
