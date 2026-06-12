/**
 * Local dev helper — seed sample feed posts + comments + reactions/votes into
 * "The All In Plan" so the Bảng tin shows realistic content.
 *
 * Usage: pnpm exec tsx scripts/dev-seed-feed.ts
 * Idempotent-ish: clears previously seeded demo posts (tag "demo-seed") first.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SLUG = "the-all-in-plan";
const HOUR = 60 * 60 * 1000;
const ago = (h: number) => new Date(Date.now() - h * HOUR);
const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;
const pick = <T,>(arr: T[]) => arr[Math.floor((arr.length - 1) * 0.5)] ?? arr[0];

const MEMBERS = [
  { name: "Minh Tâm", handle: "minhtam", className: "engineer", email: "minhtam@demo.fc" },
  { name: "Hương Giang", handle: "huonggiang", className: "marketer", email: "huonggiang@demo.fc" },
  { name: "Quốc Bảo", handle: "quocbao", className: "operator", email: "quocbao@demo.fc" },
  { name: "Lan Anh", handle: "lananh", className: "strategist", email: "lananh@demo.fc" },
  { name: "Đức Huy", handle: "duchuy", className: "hustler", email: "duchuy@demo.fc" },
];

async function main() {
  const community = await prisma.community.findUnique({ where: { slug: SLUG } });
  if (!community) throw new Error(`Community ${SLUG} not found`);
  const owner = await prisma.user.findUnique({ where: { email: "dev@focus.camp" } });
  if (!owner) throw new Error("dev@focus.camp not found — run dev-login first");

  // --- members ---
  const users: Record<string, { id: string }> = { owner };
  for (const m of MEMBERS) {
    const u = await prisma.user.upsert({
      where: { email: m.email },
      update: { name: m.name, image: avatar(m.name), handle: m.handle },
      create: { email: m.email, name: m.name, image: avatar(m.name), handle: m.handle, emailVerified: new Date() },
    });
    await prisma.membership.upsert({
      where: { userId_communityId: { userId: u.id, communityId: community.id } },
      update: {},
      create: {
        userId: u.id, communityId: community.id, role: "MEMBER", tier: "BUILDER",
        className: m.className, xp: 300 + MEMBERS.indexOf(m) * 220, level: 3 + MEMBERS.indexOf(m),
        aip: 50 + MEMBERS.indexOf(m) * 30, streakDays: MEMBERS.indexOf(m) + 1,
      },
    });
    users[m.handle] = u;
  }
  const all = [owner, ...MEMBERS.map((m) => users[m.handle])];

  // --- wipe previous demo posts ---
  const old = await prisma.post.findMany({
    where: { communityId: community.id, tags: { has: "demo-seed" } }, select: { id: true },
  });
  if (old.length) {
    await prisma.post.deleteMany({ where: { id: { in: old.map((p) => p.id) } } });
    console.log(`🧹 removed ${old.length} old demo posts`);
  }

  // --- posts ---
  type P = {
    author: { id: string }; title?: string; body: string; pillar?: string;
    tags?: string[]; pinned?: boolean; hours: number; views: number; imageUrl?: string;
  };
  const POSTS: P[] = [
    {
      author: owner, pinned: true, hours: 120, views: 412,
      title: "👋 Chào mừng tới The All In Plan!",
      body: "Đây là nơi anh em builder, dev và creator cùng nhau ship sản phẩm thật.\n\nMột vài điều nên làm ngay:\n- Giới thiệu bản thân ở comment 👇\n- Tham gia challenge **Funnel 21 ngày** đang chạy\n- Check Bảng xếp hạng để xem mình đang ở đâu\n\nHãy mạnh dạn chia sẻ — không có câu hỏi nào là ngớ ngẩn cả!",
      tags: ["thông-báo", "demo-seed"], pillar: "continuity",
    },
    {
      author: users.duchuy, hours: 26, views: 188,
      title: "Closed deal đầu tiên từ funnel mới 🎉",
      body: "Sau 2 tuần dựng lại landing page + email nurture theo SOP trong khóa Foundations, mình vừa chốt được khách hàng đầu tiên 4.9tr 🔥\n\nĐiều thay đổi lớn nhất: rút gọn form đăng ký từ 7 field xuống 3 field, conversion tăng gần gấp đôi. Cảm ơn cả nhà đã review wireframe tuần trước!",
      tags: ["win", "demo-seed"], pillar: "conversion",
    },
    {
      author: users.huonggiang, hours: 50, views: 263,
      title: "3 hook mở bài đang chạy tốt cho content ngách B2B",
      body: "Mình test 12 kiểu mở bài trong tháng qua, đây là 3 cái cho CTR cao nhất:\n\n1. \"Đừng làm X nữa nếu bạn muốn Y\"\n2. Con số gây sốc + ngữ cảnh (\"87% founder bỏ qua bước này…\")\n3. Kể 1 thất bại cụ thể của bản thân\n\nAnh em đang dùng hook nào hiệu quả? Comment chia sẻ nha.",
      tags: ["traffic", "tips", "demo-seed"], pillar: "traffic",
    },
    {
      author: users.quocbao, hours: 72, views: 141,
      title: "Cần feedback: pricing page 3 gói của mình",
      body: "Mình đang phân vân giữa để gói giữa (Pro) nổi bật hay để gói cao nhất (Master) làm anchor. Bản hiện tại đang để Pro 'Most Popular'.\n\nMọi người nghĩ sao? Có nên thêm bảng so sánh tính năng chi tiết không hay để gọn cho dễ quyết định?",
      tags: ["hỏi-đáp", "conversion", "demo-seed"], pillar: "offer",
    },
    {
      author: users.lananh, hours: 96, views: 207,
      body: "Insight nhỏ sau khi phỏng vấn 15 khách hàng: họ không mua 'khóa học', họ mua 'sự chắc chắn rằng mình sẽ không bỏ cuộc'.\n\nVì vậy thay vì bán nội dung, hãy bán cơ chế đồng hành: deadline, review, cộng đồng. Đó cũng là lý do mô hình challenge-first hiệu quả hơn khóa học truyền thống.",
      tags: ["insight", "demo-seed"], pillar: "delivery",
    },
    {
      author: users.minhtam, hours: 8, views: 64,
      title: "Tự động hoá check-in challenge bằng 1 script nhỏ",
      body: "Mình viết 1 webhook nhận message từ Telegram rồi tự tạo check-in, đỡ phải mở web mỗi ngày. Ai cần mình share repo nhé. Stack: Node + Prisma, ~80 dòng.",
      tags: ["engineer", "tools", "demo-seed"], pillar: "delivery",
    },
  ];

  const created: { id: string; author: { id: string } }[] = [];
  for (const p of POSTS) {
    const post = await prisma.post.create({
      data: {
        communityId: community.id, userId: p.author.id, type: "POST",
        title: p.title, body: p.body, pillar: p.pillar, tags: p.tags ?? ["demo-seed"],
        isPinned: !!p.pinned, viewCount: p.views, imageUrl: p.imageUrl,
        createdAt: ago(p.hours), updatedAt: ago(p.hours),
      },
    });
    created.push({ id: post.id, author: p.author });
  }
  console.log(`✅ ${created.length} posts created`);

  // --- comments (with a few nested replies) ---
  const C = (postIdx: number, author: { id: string }, body: string, hours: number, parentId?: string) =>
    prisma.comment.create({
      data: { postId: created[postIdx].id, userId: author.id, body, parentId, createdAt: ago(hours) },
    });

  // welcome post (0)
  await C(0, users.minhtam, "Chào cả nhà! Mình là Tâm, dev fullstack, đang build 1 SaaS nhỏ về quản lý chi tiêu 👋", 110);
  const r1 = await C(0, users.lananh, "Welcome Tâm! Hóng SaaS của bạn 🚀", 108);
  await C(0, owner, "Chào mừng 2 bạn! Nhớ tham gia challenge tuần này nhé 🔥", 106, r1.id);
  await C(0, users.huonggiang, "Mình là Giang, làm marketing. Rất vui được tham gia 🙌", 100);

  // duc huy win post (1)
  await C(1, users.huonggiang, "Quá đỉnh luôn! Rút form xuống 3 field đúng là chân ái 👏", 24);
  await C(1, users.quocbao, "Cho mình xin template email nurture với được không Huy?", 22);
  const r2 = await C(1, users.duchuy, "Để mình up lên Marketplace tối nay nha, free cho member 😎", 21, undefined);
  await C(1, users.quocbao, "Tuyệt vời, cảm ơn bạn!", 20, r2.id);

  // huong giang hooks (2)
  await C(2, users.duchuy, "Hook số 1 mình test cũng ra số rất ngon, nhất là cho cold audience.", 48);
  await C(2, users.minhtam, "Số 3 (kể thất bại) hợp với mình hơn, đỡ bị 'quảng cáo' quá.", 46);

  // quoc bao pricing (3)
  await C(3, users.lananh, "Mình vote để Pro nổi bật + thêm bảng so sánh GỌN (chỉ 4-5 dòng quan trọng).", 70);
  await C(3, users.huonggiang, "Đồng ý, đừng để quá nhiều tính năng làm khách bị choáng.", 68);
  await C(3, owner, "Gói cao nhất nên để làm anchor giá, nhưng CTA chính vẫn đẩy về Pro nhé.", 66);

  // lan anh insight (4)
  await C(4, users.minhtam, "Câu 'họ mua sự chắc chắn rằng mình sẽ không bỏ cuộc' hay thật 🔥", 94);
  await C(4, users.duchuy, "Đúng luôn, deadline + review là thứ giữ mình lại.", 92);

  // minh tam script (5)
  await C(5, users.quocbao, "Cho mình xin repo với! 🙏", 6);
  await C(5, users.duchuy, "+1, mình cũng cần cái này.", 5);

  const commentCount = await prisma.comment.count({ where: { post: { communityId: community.id } } });
  console.log(`✅ comments created (total in community: ${commentCount})`);

  // --- reactions + votes for engagement ---
  const EMOJIS = ["👍", "❤️", "🔥", "🎉", "👏"];
  let rx = 0, vt = 0;
  for (let i = 0; i < created.length; i++) {
    const post = created[i];
    const reactors = all.filter((u) => u.id !== post.author.id).slice(0, 2 + (i % 4));
    for (let j = 0; j < reactors.length; j++) {
      const emoji = EMOJIS[(i + j) % EMOJIS.length];
      await prisma.reaction.upsert({
        where: { postId_userId_emoji: { postId: post.id, userId: reactors[j].id, emoji } },
        update: {}, create: { postId: post.id, userId: reactors[j].id, emoji },
      }).then(() => rx++).catch(() => {});
      await prisma.vote.upsert({
        where: { postId_userId: { postId: post.id, userId: reactors[j].id } },
        update: {}, create: { postId: post.id, userId: reactors[j].id, value: 1 },
      }).then(() => vt++).catch(() => {});
    }
  }
  console.log(`✅ ${rx} reactions, ${vt} votes`);
  console.log("🎉 Feed seeded! Mở /c/the-all-in-plan/feed để xem.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
