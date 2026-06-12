/**
 * Local dev helper — seed sample affiliate data (links, referrals, commissions)
 * into "The All In Plan" so the Affiliate dashboard shows realistic numbers.
 *
 * Usage: pnpm exec tsx scripts/dev-seed-affiliate.ts
 * Idempotent: clears its own demo links (code prefix "DEMO-") first.
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const SLUG = "the-all-in-plan";
const HOUR = 60 * 60 * 1000;
const ago = (h: number) => new Date(Date.now() - h * HOUR);
const avatar = (s: string) => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(s)}`;

async function main() {
  const community = await prisma.community.findUnique({ where: { slug: SLUG } });
  if (!community) throw new Error(`Community ${SLUG} not found`);
  const cid = community.id;

  // affiliates = existing demo members (created by dev-seed-feed) or upsert them
  const affDefs = [
    { email: "minhtam@demo.fc", name: "Minh Tâm", code: "DEMO-MINHTAM", clicks: 124 },
    { email: "huonggiang@demo.fc", name: "Hương Giang", code: "DEMO-GIANG", clicks: 86 },
    { email: "duchuy@demo.fc", name: "Đức Huy", code: "DEMO-HUY", clicks: 57 },
  ];
  // referred (new) users
  const refDefs = [
    { email: "ref-tuankiet@demo.fc", name: "Tuấn Kiệt" },
    { email: "ref-mylinh@demo.fc", name: "Mỹ Linh" },
    { email: "ref-phongvu@demo.fc", name: "Phong Vũ" },
    { email: "ref-hamy@demo.fc", name: "Hà My" },
    { email: "ref-baotran@demo.fc", name: "Bảo Trân" },
    { email: "ref-quanghai@demo.fc", name: "Quang Hải" },
    { email: "ref-thuyduong@demo.fc", name: "Thuỳ Dương" },
  ];

  async function user(d: { email: string; name: string }) {
    return prisma.user.upsert({
      where: { email: d.email },
      update: { name: d.name, image: avatar(d.name) },
      create: { email: d.email, name: d.name, image: avatar(d.name), emailVerified: new Date() },
    });
  }

  const affs = [];
  for (const a of affDefs) affs.push({ def: a, user: await user(a) });
  const refs = [];
  for (const r of refDefs) refs.push(await user(r));

  // wipe previous demo links (cascade removes referrals + commissions)
  const oldLinks = await prisma.affiliateLink.findMany({
    where: { communityId: cid, code: { startsWith: "DEMO-" } }, select: { id: true },
  });
  if (oldLinks.length) {
    await prisma.affiliateLink.deleteMany({ where: { id: { in: oldLinks.map((l) => l.id) } } });
    console.log(`🧹 removed ${oldLinks.length} old demo links`);
  }

  // create links
  const links = new Map<string, { id: string }>();
  for (const a of affs) {
    // ensure no leftover link for this user in community (unique [userId, communityId])
    await prisma.affiliateLink.deleteMany({ where: { communityId: cid, userId: a.user.id } });
    const link = await prisma.affiliateLink.create({
      data: { communityId: cid, userId: a.user.id, code: a.def.code, clicks: a.def.clicks, createdAt: ago(240) },
    });
    links.set(a.def.email, link);
  }

  // referral + commission plan
  type Conv = { gross: number; pct: number; sourceType: "PRODUCT" | "CHALLENGE"; title: string; payout: "UNPAID" | "PAID"; sourceId: string };
  type Plan = { aff: string; ref: number; hAgo: number; status: string; conv?: Conv };
  const D = (n: number) => new Prisma.Decimal(n);
  const PLANS: Plan[] = [
    { aff: "minhtam@demo.fc", ref: 0, hAgo: 200, status: "CONVERTED", conv: { gross: 990000, pct: 25, sourceType: "CHALLENGE", title: "Funnel 21 ngày — Builder", payout: "PAID", sourceId: "ch-funnel-21" } },
    { aff: "minhtam@demo.fc", ref: 1, hAgo: 120, status: "CONVERTED", conv: { gross: 290000, pct: 30, sourceType: "PRODUCT", title: "Funnel Template Pack", payout: "UNPAID", sourceId: "p-funnel-template" } },
    { aff: "minhtam@demo.fc", ref: 2, hAgo: 30, status: "PENDING" },
    { aff: "huonggiang@demo.fc", ref: 3, hAgo: 160, status: "CONVERTED", conv: { gross: 299000, pct: 30, sourceType: "PRODUCT", title: "AI Challenge Coach 24/7", payout: "UNPAID", sourceId: "p-ai-coach" } },
    { aff: "huonggiang@demo.fc", ref: 4, hAgo: 48, status: "PENDING" },
    { aff: "duchuy@demo.fc", ref: 5, hAgo: 180, status: "CONVERTED", conv: { gross: 990000, pct: 25, sourceType: "PRODUCT", title: "Beginner Starter Bundle", payout: "PAID", sourceId: "p-starter-bundle" } },
    { aff: "duchuy@demo.fc", ref: 6, hAgo: 72, status: "CONVERTED", conv: { gross: 1490000, pct: 20, sourceType: "PRODUCT", title: "Hiring Playbook", payout: "UNPAID", sourceId: "p-hiring-playbook" } },
  ];

  let nRef = 0, nComm = 0;
  for (const p of PLANS) {
    const link = links.get(p.aff)!;
    const refUser = refs[p.ref];
    const commissionVnd = p.conv ? Math.round((p.conv.gross * p.conv.pct) / 100) : null;
    const referral = await prisma.referral.create({
      data: {
        linkId: link.id,
        referredUserId: refUser.id,
        status: p.status,
        convertedAt: p.conv ? ago(p.hAgo - 1) : null,
        commissionVnd: commissionVnd != null ? D(commissionVnd) : null,
        payoutStatus: p.conv?.payout ?? "UNPAID",
        createdAt: ago(p.hAgo),
      },
    });
    nRef++;
    if (p.conv) {
      await prisma.affiliateCommission.create({
        data: {
          referralId: referral.id, linkId: link.id, communityId: cid, referredUserId: refUser.id,
          sourceType: p.conv.sourceType, sourceId: p.conv.sourceId, itemTitle: p.conv.title,
          grossAmountVnd: D(p.conv.gross), commissionPercent: D(p.conv.pct), commissionVnd: D(commissionVnd!),
          payoutStatus: p.conv.payout, paidAt: p.conv.payout === "PAID" ? ago(p.hAgo - 24) : null,
          createdAt: ago(p.hAgo - 1),
        },
      });
      nComm++;
    }
  }

  const totalComm = PLANS.filter((p) => p.conv).reduce((s, p) => s + Math.round((p.conv!.gross * p.conv!.pct) / 100), 0);
  console.log(`✅ ${affs.length} affiliates, ${nRef} referrals, ${nComm} conversions`);
  console.log(`💰 tổng hoa hồng: ${totalComm.toLocaleString("vi-VN")}đ`);
  console.log("🎉 Affiliate seeded! Mở /c/the-all-in-plan/affiliate để xem.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
