/**
 * Full demo seed — mô phỏng nội dung sôi nổi cho "The All In Plan"
 * Run: npx tsx scripts/seed-full-demo.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ─── Demo users ────────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: "minh.anh@demo.fc", name: "Minh Anh", handle: "minhanh_demo", bio: "Builder đang học làm funnel từ số 0", location: "TP.HCM" },
  { email: "tuan.kiet@demo.fc", name: "Tuấn Kiệt", handle: "tuankiet_demo", bio: "Freelancer web design | ship mỗi tuần", location: "Hà Nội" },
  { email: "thu.ha@demo.fc", name: "Thu Hà", handle: "thuha_demo", bio: "Content creator & copywriter", location: "Đà Nẵng" },
  { email: "hong.ngoc@demo.fc", name: "Hồng Ngọc", handle: "hongngoc_demo", bio: "Ecom | TikTok Shop | review sản phẩm", location: "Cần Thơ" },
  { email: "duc.minh@demo.fc", name: "Đức Minh", handle: "ducminh_demo", bio: "SaaS founder | 3 lần fail, lần này seriously", location: "TP.HCM" },
  { email: "lan.phuong@demo.fc", name: "Lan Phương", handle: "lanphuong_demo", bio: "Marketing manager → đang build product riêng", location: "Hà Nội" },
  { email: "quoc.bao@demo.fc", name: "Quốc Bảo", handle: "quocbao_demo", bio: "Developer | React, Node | thích side project", location: "TP.HCM" },
  { email: "mai.linh@demo.fc", name: "Mai Linh", handle: "mailinh_demo", bio: "Ex-banker đang pivot sang digital business", location: "Hải Phòng" },
];

const MEMBERSHIP_DATA = [
  { xp: 8420, level: 42, aip: 3200, gems: 12, streakDays: 23, className: "hustler",    tier: "MASTER",  role: "MEMBER" },
  { xp: 6190, level: 31, aip: 2100, gems:  8, streakDays: 15, className: "engineer",   tier: "MASTER",  role: "MEMBER" },
  { xp: 4850, level: 24, aip: 1540, gems:  5, streakDays:  9, className: "marketer",   tier: "BUILDER", role: "MEMBER" },
  { xp: 3210, level: 18, aip:  980, gems:  3, streakDays:  4, className: "operator",   tier: "BUILDER", role: "MEMBER" },
  { xp: 7730, level: 38, aip: 2870, gems: 10, streakDays: 30, className: "strategist", tier: "MASTER",  role: "MOD"    },
  { xp: 2140, level: 12, aip:  620, gems:  1, streakDays:  2, className: "hustler",    tier: "BUILDER", role: "MEMBER" },
  { xp: 5560, level: 28, aip: 1920, gems:  7, streakDays: 18, className: "engineer",   tier: "MASTER",  role: "MEMBER" },
  { xp: 1280, level:  7, aip:  310, gems:  0, streakDays:  1, className: "marketer",   tier: "BUILDER", role: "MEMBER" },
];

// ─── Channel messages ──────────────────────────────────────────────────
const WELCOME_MSGS = [
  "Chào mừng bạn đến với The All In Plan! 👋 Đây là nơi những người nghiêm túc với việc xây dựng sản phẩm và kinh doanh online tụ lại.",
  "Quy tắc đơn giản: **ship thật**, **chia sẻ thật**, **hỗ trợ nhau**. Không spam, không bán hàng linh tinh.",
  "Bắt đầu bằng cách giới thiệu bản thân ở #discussion-vn nhé! Kể cho cộng đồng nghe bạn đang xây dựng gì.",
];

const DISCUSSION_MSGS = [
  "Xin chào mọi người! Mình là Minh Anh, đang học làm landing page cho sản phẩm SaaS đầu tiên. Vừa hoàn thành bài 3 khóa Foundations, cảm giác đỉnh thật 🔥",
  "Welcome Minh Anh! Landing page quan trọng lắm. Bạn đang dùng tool gì để build? Framer hay code tay?",
  "Mình dùng Framer cho nhanh 😄 nhưng đang học thêm để tự code. Tuần này mình đặt mục tiêu là làm xong MVP trước thứ 6.",
  "Hay đấy! Mình cũng đang trong challenge Funnel 21 ngày, checkin hôm nay về phần copywriting. Ai có feedback cho mình không?",
  "Post link lên feed đi bạn, anh em sẽ review cho. Ở đây mọi người hay cho feedback thẳng thắn lắm.",
  "Check-in ngày 12 xong rồi! Landing page draft đầu tiên xong, tỷ lệ opt-in test 18% — còn thấp nhưng đang cải thiện dần 📈",
  "18% là ổn cho lần đầu đó bạn ơi! Mình nhớ lần đầu của mình chỉ có 6% thôi 😂 Cứ keep going!",
  "Mọi người ai có template email sequence không? Mình đang stuck ở bước nurture lead.",
  "Trong khóa học có phần email nurture đó bạn! Bài 5 — mình vừa học xong hôm qua, cực kỳ practical.",
  "Thanks! Mình sẽ xem ngay. À mà ai đang làm challenge cùng mình không, cùng nhau accountability cho vui?",
];

const TIPS_MSGS = [
  "💡 **Tip tuần này**: Thay vì viết headline chung chung, hãy thử format: [Kết quả cụ thể] trong [Thời gian cụ thể] mà không cần [Nỗi sợ lớn nhất]",
  "Ví dụ: 'Tăng 300 lead trong 30 ngày mà không cần chạy ads' — nghe cụ thể và compelling hơn nhiều phải không?",
  "📚 Resource hay: **The Copywriter's Handbook** của Robert Bly — mình đọc xong rồi và thấy mindset về copywriting thay đổi hẳn.",
  "Reminder: Workshop 'Xây dựng Offer từ 0' diễn ra thứ Tư tới lúc 8pm. Link sẽ post trước 1 tiếng. Ai muốn tham gia react 🙋 nha.",
  "🙋🙋🙋 (mọi người react vào đây)",
  "Cảm ơn admin! Mình đã đặt reminder rồi. Tuần này học được nhiều lắm, especially phần positioning.",
];

// ─── Feed posts ────────────────────────────────────────────────────────
const FEED_POSTS = [
  {
    title: "Sau 21 ngày challenge: 3 điều mình học được về copywriting",
    body: `Vừa hoàn thành challenge Funnel 21 ngày! Đây là những insights thực tế nhất mình rút ra:\n\n**1. Headline là 80% tất cả**\nMình tốn 3 ngày đầu viết copy thân nhưng conversion rate vẫn thấp. Hóa ra vì headline quá chung. Sau khi test 5 versions khác nhau, version dùng số cụ thể ("Tăng 47% opt-in") convert gấp đôi.\n\n**2. Một trang, một mục tiêu**\nLanding page đầu tiên của mình có... 4 CTA button 🤦. Không ai biết phải bấm gì. Sau khi bỏ hết chỉ còn 1 nút, bounce rate giảm 30%.\n\n**3. Social proof > feature list**\nNgười ta không mua feature, họ mua kết quả của người khác. Thêm 2 testimonial ngắn = conversion tăng ngay.`,
    pillar: "conversion",
    tags: ["copywriting", "landing-page", "conversion"],
    isCot: true,
    viewCount: 342,
  },
  {
    title: "Chia sẻ: Template email welcome sequence 5 bước của mình",
    body: `Nhiều bạn hỏi về email nurture nên mình viết ra đây. Đây là sequence mình đang dùng cho 200+ subscribers:\n\n**Email 1 (ngay sau opt-in):** Welcome + deliver lead magnet + đặt kỳ vọng gì sẽ nhận được\n**Email 2 (ngày 2):** Story — bạn từ đâu đến, tại sao làm điều này\n**Email 3 (ngày 4):** Giá trị thuần — 1 tip cực kỳ actionable, không bán hàng\n**Email 4 (ngày 7):** Social proof + tease về offer\n**Email 5 (ngày 10):** Soft pitch — chỉ cho những ai có vấn đề X\n\nOpen rate hiện tại: 41%. Click rate: 8.3%. Ai muốn template thì comment bên dưới mình share link nhé!`,
    pillar: "conversion",
    tags: ["email", "marketing", "template"],
    isCot: false,
    viewCount: 218,
  },
  {
    title: "MVP xong! Sau 3 tuần không ngủ đủ giấc 😅",
    body: `Cuối cùng cũng ship được v1.0 của tool tracking habits mình build trong challenge!\n\nStack: Next.js + Supabase + Vercel\nThời gian build: 18 ngày (2-3 tiếng/tối)\n\nLink: [không public vì chưa polish lắm]\n\nNhững gì mình học được khi build 'thật':\n- Scope creep là kẻ thù số 1\n- "Done is better than perfect" không phải câu nói cho vui\n- Deploy sớm = feedback sớm = học nhanh hơn\n\nAi muốn beta test không? Cần 5-10 người dùng thử và cho feedback thật (kể cả harsh feedback đều welcome!)`,
    pillar: "offer",
    tags: ["side-project", "mvp", "build-in-public"],
    isCot: false,
    viewCount: 187,
  },
  {
    title: "[Hỏi] Ai đang dùng TikTok Shop cho khóa học digital?",
    body: `Mình đang nghiên cứu kênh bán khóa học qua TikTok Shop thay vì chỉ web. Thuế/phí như thế nào? Có ai đã thử chưa, share kinh nghiệm với!\n\nCâu hỏi cụ thể:\n1. Commission TikTok lấy bao nhiêu %?\n2. Digital product (PDF, video course) có được bán không?\n3. Có cần business account riêng không?\n\nCảm ơn trước nha 🙏`,
    pillar: "traffic",
    tags: ["tiktok", "digital-product", "hoi-dap"],
    isCot: false,
    viewCount: 143,
  },
  {
    title: "Week 3 update: Từ 0 lên 847 email subscribers",
    body: `Update tiến độ challenge tuần 3!\n\n📈 **Số liệu:**\n- Email list: 0 → 847 subscribers trong 21 ngày\n- Nguồn traffic chính: TikTok organic (73%), nhóm Facebook (18%), bạn bè giới thiệu (9%)\n- Conversion landing page: 23% (target ban đầu là 15%)\n\n💡 **Chiến thuật hiệu quả nhất:**\nPost 1 video TikTok mỗi ngày về "mistake" phổ biến trong niche → cuối video offer lead magnet miễn phí. Simple nhưng work.\n\n🔮 **Kế hoạch tuần tới:**\nNurture list + launch mini offer $97. Will report back!`,
    pillar: "traffic",
    tags: ["email-list", "tiktok", "growth"],
    isCot: true,
    viewCount: 524,
  },
  {
    title: "Review trung thực: Sau 2 tháng dùng AI để viết content",
    body: `Nhiều người hỏi mình về việc dùng AI viết content nên mình sẽ honest hoàn toàn:\n\n**Dùng được (save time thật):**\n- Draft outline cho bài blog\n- Brainstorm angle mới cho chủ đề quen\n- Rewrite để clear hơn\n- Translate VN ↔ EN\n\n**Không nên dùng:**\n- Viết toàn bộ bài (đọc là biết ngay, mất trust)\n- Tạo "voice" của bạn (AI không biết bạn là ai)\n- Fact-check (AI hallucinate)\n\n**Bottom line:** AI là assistant tốt, không phải replacement. Người nào dùng AI thay thế hoàn toàn đang đi đường tắt sẽ bị bỏ lại phía sau khi audience của họ nhận ra.`,
    pillar: "delivery",
    tags: ["ai", "content", "review"],
    isCot: false,
    viewCount: 391,
  },
];

const COT_POSTS = [
  {
    title: "📌 Quy tắc cộng đồng — đọc trước khi post",
    body: `**The All In Plan — Quy tắc**\n\n✅ **Được phép:**\n- Chia sẻ progress, wins, fails thật\n- Hỏi câu hỏi dù nhỏ\n- Feedback thẳng thắn, có căn cứ\n- Share resource hữu ích\n\n❌ **Không được:**\n- Spam affiliate link không liên quan\n- Hỏi câu hỏi "lazy" (đã Google chưa?)\n- Toxic positivity hoặc toxic negativity\n- Bán hàng trực tiếp trong group\n\nVi phạm lần 1: nhắc nhở. Lần 2: kick. Không có exception.\n\nWelcome to the community 🤝`,
    isPinned: true,
  },
  {
    title: "📌 Resources tốt nhất cho builder mới",
    body: `**Danh sách resources được community vote cao nhất:**\n\n**Sách:**\n- $100M Offers — Alex Hormozi\n- Building a StoryBrand — Donald Miller\n- The Lean Startup — Eric Ries\n\n**Podcast:**\n- My First Million\n- Indie Hackers\n- How I Built This\n\n**Tools miễn phí:**\n- Notion (planning)\n- Canva (design)\n- Tally (form)\n- Beehiiv (email)\n\n**Khóa học trong community:**\n- Foundations — Sales Funnel Basics ✅\n- Challenge 21 ngày Funnel (đang active)\n\nUpdate thường xuyên. DM admin nếu muốn thêm resource.`,
    isPinned: true,
  },
];

const QA_POSTS = [
  {
    title: "Làm thế nào để định giá digital product lần đầu?",
    body: `Mình đang chuẩn bị bán template Notion + video hướng dẫn. Vấn đề là không biết định giá bao nhiêu cho phù hợp.\n\nSản phẩm: Notion template quản lý freelance project + 3 video walkthrough (tổng ~45 phút)\n\nTarget audience: Freelancer VN mới bắt đầu\n\nMình đang nghĩ 99k-149k. Có ai có kinh nghiệm pricing không? Thấp quá hay cao quá?`,
    answer: "Với digital product lần đầu, mình recommend giá 99k-149k là phù hợp. Quan trọng nhất là test: launch ở 99k trước, nếu bán được 10 cái trong 2 tuần thì raise lên 149k. Đừng overthink pricing — data sẽ trả lời cho bạn.",
    answererIdx: 0,
  },
  {
    title: "Cách tăng open rate email từ 15% lên cao hơn?",
    body: `Email list của mình khoảng 400 subs, nhưng open rate chỉ 15-17%, thấp hơn benchmark ngành.\n\nMình đã thử:\n- A/B test subject line\n- Gửi vào 8am thứ 3 và thứ 5\n- Personalize first name\n\nVẫn không cải thiện nhiều. Có bạn nào đã từng qua tình huống này không? Share kinh nghiệm với!`,
    answer: "Open rate 15% là thấp nhưng fix được. Điều đầu tiên cần làm: clean list — remove inactive người 3 tháng không mở. Sau đó focus vào subject line: thêm số hoặc emoji, test 2 versions mỗi email. Mình đã lên từ 14% lên 38% sau 6 tuần làm đúng cách.",
    answererIdx: 1,
  },
];

const SIGNAL_POSTS = [
  {
    title: "📊 Tín hiệu thị trường: Nhu cầu học AI tăng 340% YoY tại VN",
    body: `Theo báo cáo vừa publish của Google APAC:\n\n- Lượt tìm kiếm "học AI" tại VN tăng 340% so với cùng kỳ năm ngoái\n- 67% doanh nghiệp VN đang tìm người biết dùng AI tools\n- Nhóm tuổi 25-35 chiếm 58% learner\n\n**Cơ hội cho builder:**\nNếu bạn đang build bất kỳ thứ gì liên quan đến AI education, đây là thời điểm vàng. Nhu cầu lớn nhưng supply content chất lượng còn thiếu.\n\nMình đang observe trend này và có kế hoạch launch 1 mini-course về "AI cho Non-Techie" trong Q3.`,
    userId: "owner",
  },
  {
    title: "📢 Insight từ 200 landing page test trong 6 tháng",
    body: `Mình vừa tổng hợp data từ 200+ landing page test của các bạn trong community:\n\n**Headline winners:**\n- Dùng số cụ thể: +34% CTR\n- Đặt câu hỏi: +28% CTR\n- Dùng "bạn": +19% CTR\n\n**Killer của conversion:**\n- Load time >3s: -47%\n- Nhiều hơn 1 CTA: -31%\n- Không có social proof: -25%\n\n**Best performing format:**\nHero → Pain → Solution → Social Proof → CTA\nSimple nhưng consistently work nhất.\n\nFull report mình sẽ publish vào cuối tuần trong phần Tài nguyên.`,
    userId: "demo4",
  },
];

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "dev@focus.camp";
  const owner = await prisma.user.findFirst({ where: { email: { contains: ownerEmail } } });
  if (!owner) { console.error("❌ Owner not found"); process.exit(1); }

  const community = await prisma.community.findUnique({ where: { slug: "the-all-in-plan" } });
  if (!community) { console.error("❌ Community 'the-all-in-plan' not found. Run seed-demo-discovery first."); process.exit(1); }

  console.log("✅ Community:", community.name);

  // ── 1. Create demo users ──────────────────────────────────────────
  const demoUserIds: string[] = [];
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, handle: u.handle, bio: u.bio, location: u.location },
      create: { email: u.email, name: u.name, handle: u.handle, bio: u.bio, location: u.location },
    });
    demoUserIds.push(user.id);
    console.log(`✅ User: ${u.name}`);
  }

  // ── 2. Create memberships ────────────────────────────────────────
  for (let i = 0; i < demoUserIds.length; i++) {
    const m = MEMBERSHIP_DATA[i];
    await prisma.membership.upsert({
      where: { userId_communityId: { userId: demoUserIds[i], communityId: community.id } },
      update: { xp: m.xp, level: m.level, aip: m.aip, gems: m.gems, streakDays: m.streakDays },
      create: {
        userId: demoUserIds[i], communityId: community.id,
        role: m.role,
        tier: m.tier, className: m.className,
        xp: m.xp, level: m.level, aip: m.aip, gems: m.gems, streakDays: m.streakDays,
      },
    });
  }
  console.log(`✅ ${demoUserIds.length} memberships created`);

  await prisma.community.update({
    where: { id: community.id },
    data: { memberCount: 247 },
  });

  // ── 3. Channel messages ──────────────────────────────────────────
  const channels = await prisma.channel.findMany({ where: { communityId: community.id } });
  const welcomeChannel = channels.find(c => c.slug === "welcome");
  const discussionChannel = channels.find(c => c.slug === "discussion-vn");
  const tipsChannel = channels.find(c => c.slug === "tips-and-news");

  // Only create if channel is empty
  if (welcomeChannel) {
    const existing = await prisma.message.count({ where: { channelId: welcomeChannel.id } });
    if (existing === 0) {
      for (const content of WELCOME_MSGS) {
        await prisma.message.create({ data: { channelId: welcomeChannel.id, userId: owner.id, content } });
      }
      console.log("✅ Welcome messages");
    } else {
      console.log("⏭ Welcome messages already exist");
    }
  }

  if (discussionChannel) {
    const existing = await prisma.message.count({ where: { channelId: discussionChannel.id } });
    if (existing === 0) {
      const discussionUsers = [
        demoUserIds[0], demoUserIds[1], demoUserIds[0], demoUserIds[2], demoUserIds[1],
        demoUserIds[0], demoUserIds[3], demoUserIds[2], demoUserIds[1], demoUserIds[0],
      ];
      for (let i = 0; i < DISCUSSION_MSGS.length; i++) {
        await prisma.message.create({
          data: { channelId: discussionChannel.id, userId: discussionUsers[i], content: DISCUSSION_MSGS[i] },
        });
      }
      console.log("✅ Discussion messages");
    } else {
      console.log("⏭ Discussion messages already exist");
    }
  }

  if (tipsChannel) {
    const existing = await prisma.message.count({ where: { channelId: tipsChannel.id } });
    if (existing === 0) {
      const tipUsers = [owner.id, owner.id, owner.id, owner.id, demoUserIds[1], demoUserIds[0]];
      for (let i = 0; i < TIPS_MSGS.length; i++) {
        await prisma.message.create({
          data: { channelId: tipsChannel.id, userId: tipUsers[i % tipUsers.length], content: TIPS_MSGS[i] },
        });
      }
      console.log("✅ Tips messages");
    } else {
      console.log("⏭ Tips messages already exist");
    }
  }

  // ── 4. Feed posts ────────────────────────────────────────────────
  const existingPostCount = await prisma.post.count({ where: { communityId: community.id, type: "POST" } });
  if (existingPostCount < 3) {
    const postUserIds = [
      demoUserIds[0], demoUserIds[1], demoUserIds[2], demoUserIds[3],
      demoUserIds[0], demoUserIds[4], demoUserIds[5], demoUserIds[6],
    ];
    for (let i = 0; i < FEED_POSTS.length; i++) {
      const p = FEED_POSTS[i];
      const userId = postUserIds[i % postUserIds.length];
      const daysAgo = (FEED_POSTS.length - i) * 2;
      const post = await prisma.post.create({
        data: {
          communityId: community.id,
          userId,
          type: "POST",
          title: p.title,
          body: p.body,
          pillar: p.pillar,
          tags: p.tags,
          isCot: p.isCot,
          cotApprovedAt: p.isCot ? new Date(Date.now() - daysAgo * 86400000) : null,
          viewCount: p.viewCount,
          createdAt: new Date(Date.now() - daysAgo * 86400000),
        },
      });

      // Reactions
      const reactors = demoUserIds.filter(id => id !== userId).slice(0, 4);
      for (const reactorId of reactors) {
        await prisma.reaction.upsert({
          where: { postId_userId_emoji: { postId: post.id, userId: reactorId, emoji: "🔥" } },
          update: {},
          create: { postId: post.id, userId: reactorId, emoji: "🔥" },
        }).catch(() => {});
      }

      // Comments
      const commenters = demoUserIds.filter(id => id !== userId).slice(0, 2);
      const COMMENT_PAIRS = [
        ["Bài viết cực kỳ hay! Mình cũng đang gặp vấn đề tương tự, sẽ thử áp dụng ngay.", "Cảm ơn bạn đã chia sẻ thật lòng. Đây đúng là những gì mình cần nghe 🙏"],
        ["Useful quá! Mình bookmark lại để đọc kỹ hơn.", "Agree 100%. Nhất là điểm về social proof, mình hay bỏ qua cái này."],
        ["Ngưỡng mộ sự kiên trì của bạn! Keep going nhé.", "Đây là loại bài mình muốn thấy nhiều hơn trong community ❤️"],
      ];
      const commentSet = COMMENT_PAIRS[i % COMMENT_PAIRS.length];
      for (let j = 0; j < Math.min(commenters.length, commentSet.length); j++) {
        await prisma.comment.create({
          data: { postId: post.id, userId: commenters[j], body: commentSet[j] },
        });
      }
    }
    console.log(`✅ ${FEED_POSTS.length} feed posts`);
  } else {
    console.log("⏭ Feed posts already exist");
  }

  // ── 5. Cốt posts ────────────────────────────────────────────────
  const existingCotCount = await prisma.post.count({ where: { communityId: community.id, isCot: true } });
  if (existingCotCount < 2) {
    for (const p of COT_POSTS) {
      await prisma.post.create({
        data: {
          communityId: community.id,
          userId: owner.id,
          type: "POST",
          title: p.title,
          body: p.body,
          isPinned: p.isPinned,
          isCot: true,
          cotApprovedAt: new Date(Date.now() - 5 * 86400000),
          viewCount: 180,
          createdAt: new Date(Date.now() - 10 * 86400000),
        },
      });
    }
    console.log("✅ Cốt posts");
  }

  // ── 6. Q&A posts ────────────────────────────────────────────────
  const existingQACount = await prisma.post.count({ where: { communityId: community.id, type: "QA" } });
  if (existingQACount === 0) {
    const qaUserIds = [demoUserIds[3], demoUserIds[7]];
    for (let i = 0; i < QA_POSTS.length; i++) {
      const p = QA_POSTS[i];
      const post = await prisma.post.create({
        data: {
          communityId: community.id,
          userId: qaUserIds[i % qaUserIds.length],
          type: "QA",
          title: p.title,
          body: p.body,
          viewCount: 60 + i * 30,
          createdAt: new Date(Date.now() - (i + 1) * 3 * 86400000),
        },
      });
      await prisma.comment.create({
        data: {
          postId: post.id,
          userId: demoUserIds[p.answererIdx],
          body: p.answer,
          isBestAnswer: true,
        },
      });
    }
    console.log("✅ Q&A posts");
  }

  // ── 7. Signal posts ──────────────────────────────────────────────
  const existingSignalCount = await prisma.post.count({ where: { communityId: community.id, type: "SIGNAL" } });
  if (existingSignalCount === 0) {
    for (let i = 0; i < SIGNAL_POSTS.length; i++) {
      const p = SIGNAL_POSTS[i];
      await prisma.post.create({
        data: {
          communityId: community.id,
          userId: p.userId === "owner" ? owner.id : demoUserIds[4],
          type: "SIGNAL",
          title: p.title,
          body: p.body,
          viewCount: 150 + i * 80,
          createdAt: new Date(Date.now() - (i + 1) * 86400000),
        },
      });
    }
    console.log("✅ Signal posts");
  }

  // ── 8. Challenge tasks + members + check-ins ─────────────────────
  const challenge = await prisma.challenge.findFirst({
    where: { communityId: community.id, slug: "funnel-21" },
  });

  if (challenge) {
    const TASK_TITLES = [
      "Xác định target audience và pain point cốt lõi",
      "Nghiên cứu 5 competitor và tìm gap trên thị trường",
      "Viết Unique Value Proposition (UVP) đầu tiên",
      "Xây dựng Offer Stack: core + bonus + guarantee",
      "Tạo headline cho landing page — test 3 versions",
      "Viết phần Hero section hoàn chỉnh",
      "Viết phần Pain Agitate Solution",
      "Collect 3 testimonials hoặc tạo kết quả demo",
      "Thiết kế landing page trên Framer/Webflow/code",
      "Setup email opt-in form và automation",
      "Viết email welcome (email #1 của sequence)",
      "Viết email story (email #2)",
      "Viết email value (email #3) — không bán hàng",
      "Viết email social proof (email #4)",
      "Viết email pitch (email #5)",
      "Setup traffic nguồn 1: TikTok Organic",
      "Setup traffic nguồn 2: Facebook Group",
      "Launch landing page và thu first 10 leads",
      "Review data và optimize headline/CTA",
      "Scale traffic và aim for 50 leads",
      "Tổng kết, đo lường kết quả và plan next step",
    ];

    for (let day = 1; day <= 21; day++) {
      await prisma.challengeTask.upsert({
        where: { challengeId_dayNumber: { challengeId: challenge.id, dayNumber: day } },
        update: {},
        create: {
          challengeId: challenge.id,
          dayNumber: day,
          title: TASK_TITLES[day - 1],
          description: `Nhiệm vụ ngày ${day}: ${TASK_TITLES[day - 1]}. Hoàn thành và checkin với evidence cụ thể.`,
          evidenceType: "TEXT",
          evidenceLabel: "Mô tả kết quả bạn đạt được hôm nay",
        },
      });
    }
    console.log("✅ 21 challenge tasks");

    const tasks = await prisma.challengeTask.findMany({
      where: { challengeId: challenge.id },
      orderBy: { dayNumber: "asc" },
    });

    const MEMBER_DAYS = [21, 18, 14, 12, 9, 7, 3, 1];
    const CHECKIN_CONTENTS = [
      "Xong! Mình đã identify được audience là freelancer VN 25-35 tuổi, pain chính là không biết định giá dịch vụ. Insight thú vị: họ sợ bị reject hơn là thực sự cần tăng giá.",
      "Đã nghiên cứu xong. Gap lớn nhất: không ai dạy cách 'sell' cho người Việt — hầu hết đều copy framework US không phù hợp văn hóa.",
      "UVP draft: 'Từ 0 đến landing page convert trong 7 ngày, dành cho freelancer VN không biết marketing.' Cần polish thêm nhưng direction đúng rồi.",
      "Offer stack done: Core (template Notion) + Bonus 1 (3 video walkthrough) + Bonus 2 (group coaching 1 buổi) + Guarantee (30 ngày hoàn tiền). Total perceived value: 5tr, price: 299k.",
      "Test 3 headline xong. Winner: 'Freelancer VN: Tăng giá mà không mất client — trong 14 ngày' — CTR 4.2% vs 1.8% và 2.1%",
      "Hero section done! Đây là lần đầu mình viết copy dài mà không bị 'blank page syndrome'. Framework PAS cực kỳ hữu ích.",
      "Landing page live! Link: [private]. Opt-in form setup, welcome email đã test. Cảm giác achievement thật sự khi thấy form hoạt động.",
    ];

    for (let i = 0; i < Math.min(demoUserIds.length, MEMBER_DAYS.length); i++) {
      const userId = demoUserIds[i];
      const daysCompleted = MEMBER_DAYS[i];
      const startedAt = new Date(Date.now() - daysCompleted * 86400000 - 86400000);

      await prisma.challengeMember.upsert({
        where: { challengeId_userId: { challengeId: challenge.id, userId } },
        update: {},
        create: {
          challengeId: challenge.id,
          userId,
          status: daysCompleted >= 21 ? "COMPLETED" : "ACTIVE",
          joinedAt: startedAt,
          approvedAt: startedAt,
          personalStartsAt: startedAt,
          lastCheckinAt: new Date(Date.now() - 86400000),
          completedAt: daysCompleted >= 21 ? new Date(Date.now() - 86400000) : null,
        },
      });

      // Create check-ins (skip if already exists for this user+day)
      const daysToCheckin = Math.min(daysCompleted, tasks.length, CHECKIN_CONTENTS.length);
      for (let day = 1; day <= daysToCheckin; day++) {
        const task = tasks.find(t => t.dayNumber === day);
        if (!task) continue;
        const exists = await prisma.checkin.findFirst({
          where: { challengeId: challenge.id, userId, dayNumber: day },
        });
        if (!exists) {
          await prisma.checkin.create({
            data: {
              challengeId: challenge.id,
              userId,
              taskId: task.id,
              dayNumber: day,
              content: CHECKIN_CONTENTS[(day - 1) % CHECKIN_CONTENTS.length],
              status: "APPROVED",
              createdAt: new Date(startedAt.getTime() + day * 86400000),
            },
          });
        }
      }
    }
    console.log("✅ Challenge members + check-ins");

    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { featuredOnGlobal: true, status: "ACTIVE" },
    });
  } else {
    console.log("⚠️ Challenge 'funnel-21-ngay' not found — skipping tasks/checkins");
  }

  // ── 9. Course lessons ────────────────────────────────────────────
  const course = await prisma.course.findFirst({
    where: { communityId: community.id },
    include: { lessons: true },
  });

  if (course) {
    if (course.lessons.length === 0) {
      const LESSONS = [
        { title: "Bài 1: Offer là gì? Tại sao 90% người bán hàng bắt đầu sai", duration: 384, position: 0 },
        { title: "Bài 2: Xác định target audience — không phải ai cũng là khách hàng của bạn", duration: 467, position: 1 },
        { title: "Bài 3: Xây dựng Offer Stack hoàn chỉnh", duration: 521, position: 2 },
        { title: "Bài 4: Copywriting cơ bản — viết để bán, không phải để hay", duration: 612, position: 3 },
        { title: "Bài 5: Landing page từ A-Z — template và wireframe có sẵn", duration: 734, position: 4 },
        { title: "Bài 6: Email sequence 5 bước cho người mới — setup trong 1 buổi", duration: 489, position: 5 },
        { title: "Bài 7: Traffic nguồn 1 — TikTok Organic không cần face cam", duration: 556, position: 6 },
        { title: "Bài 8: Traffic nguồn 2 — Facebook Group và SEO cơ bản", duration: 398, position: 7 },
        { title: "Bài 9: Đo lường và tối ưu — những con số thực sự quan trọng", duration: 445, position: 8 },
        { title: "Bài 10: Scale và automation — từ manual lên hệ thống", duration: 682, position: 9 },
      ];
      for (const lesson of LESSONS) {
        await prisma.lesson.create({
          data: { courseId: course.id, title: lesson.title, duration: lesson.duration, position: lesson.position },
        });
      }
      console.log("✅ 10 course lessons created");
    } else {
      console.log(`⏭ Course already has ${course.lessons.length} lessons`);
    }

    const lessons = await prisma.lesson.findMany({ where: { courseId: course.id }, orderBy: { position: "asc" } });
    const PROGRESS = [10, 7, 5, 3, 8, 2, 6, 1];
    for (let i = 0; i < Math.min(demoUserIds.length, PROGRESS.length); i++) {
      const count = Math.min(PROGRESS[i], lessons.length);
      for (let j = 0; j < count; j++) {
        await prisma.courseProgress.upsert({
          where: { userId_lessonId: { userId: demoUserIds[i], lessonId: lessons[j].id } },
          update: {},
          create: {
            userId: demoUserIds[i],
            lessonId: lessons[j].id,
            completed: true,
            completedAt: new Date(Date.now() - (count - j) * 86400000),
          },
        });
      }
    }
    console.log("✅ Course progress for members");
  } else {
    console.log("⚠️ No course found — skipping lessons");
  }

  // ── 10. Marketplace products ─────────────────────────────────────
  const PRODUCTS = [
    {
      slug: "notion-funnel-template",
      title: "Notion Funnel Planner Template",
      description: "Template Notion đầy đủ để lên kế hoạch và track toàn bộ funnel bán hàng. Bao gồm: Offer stack, Copywriting checklist, Traffic tracker, Email sequence planner. Đã được 120+ members dùng.",
      type: "TEMPLATE",
      priceVnd: 149000,
      priceOldVnd: 299000,
      isFree: false,
      pillar: "offer",
    },
    {
      slug: "email-sequence-swipe-file",
      title: "Email Sequence Swipe File — 50 Subject Line Convert",
      description: "50 subject line email đã được test thực tế với open rate trung bình 35-42%. Kèm theo 10 email template hoàn chỉnh cho 5 loại sequence phổ biến nhất.",
      type: "TEMPLATE",
      priceVnd: 99000,
      priceOldVnd: null,
      isFree: false,
      pillar: "conversion",
    },
    {
      slug: "landing-page-audit-checklist",
      title: "Checklist Audit Landing Page — 47 điểm kiểm tra",
      description: "Checklist 47 điểm để tự audit landing page của bạn trước khi chạy traffic. Từ UX, copy đến kỹ thuật tối ưu conversion. Miễn phí cho members.",
      type: "TEMPLATE",
      priceVnd: 0,
      priceOldVnd: null,
      isFree: true,
      pillar: "conversion",
    },
    {
      slug: "tiktok-organic-playbook",
      title: "TikTok Organic Playbook cho Digital Seller VN",
      description: "Hướng dẫn step-by-step để grow TikTok từ 0 và convert viewer thành lead/buyer. Bao gồm content calendar, hook formula, caption template.",
      type: "GUIDE",
      priceVnd: 199000,
      priceOldVnd: 399000,
      isFree: false,
      pillar: "traffic",
    },
  ];

  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { communityId_slug: { communityId: community.id, slug: p.slug } },
      update: {},
      create: {
        communityId: community.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        type: p.type,
        priceVnd: p.priceVnd,
        priceOldVnd: p.priceOldVnd,
        isFree: p.isFree,
        pillar: p.pillar,
        isVisible: true,
      },
    });
  }
  console.log(`✅ ${PRODUCTS.length} marketplace products`);

  console.log("\n🎉 Full demo seed hoàn tất!");
  console.log("  - 8 demo users + memberships (leaderboard data)");
  console.log("  - Chat messages: welcome, discussion-vn, tips-and-news");
  console.log("  - 6 feed posts + 2 cốt + 2 Q&A + 2 signals");
  console.log("  - 21 challenge tasks + 8 members + check-ins");
  console.log("  - 10 course lessons + progress tracking");
  console.log("  - 4 marketplace products");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
