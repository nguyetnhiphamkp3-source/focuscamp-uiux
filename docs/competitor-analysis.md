# Competitor analysis & product vision

_Recovered from session `ux-ui-design-nh-p/5c584789` (Apr 15–16 2026). This
file is now the source of truth — update in-place, don't re-analyze._

## 1. Core positioning

```
Whop        = Shopify của creators (bán mọi thứ)
Skool       = Classroom + community
focus.camp  = COMMUNITY CHALLENGE PLATFORM + AI AGENT AS A SERVICE
              └─ Courses, products, tools = "power-ups" để hoàn thành challenge
```

**Slogan candidates:**
- "Learn by doing, grow by challenging"
- "The challenge-first community platform"
- "Your AI-powered community adventure"

## 2. USP không thể sao chép

### 2.1 Challenge-driven engagement loop
```
User tham gia community
  ↓
Thấy challenge hấp dẫn (vd "Ship product trong 21 ngày")
  ↓
Muốn hoàn thành → cần kiến thức/tool/template
  ↓
Mua course/product/tool trong cùng platform (power-up)
  ↓
Dùng tool → complete challenge → earn XP/currency/gems
  ↓
Lên level → unlock challenge khó hơn → repeat
```

**Tiền được chi vì có lý do cụ thể**, không phải "tôi muốn học lý thuyết".
Challenge tạo urgency, courses/products trở thành công cụ không phải
mục đích.

### 2.2 AI Agent as a Service
- Agents hỗ trợ user học & thực thi challenge
- Kết nối Telegram/Zalo cho support đúng ngữ cảnh
- Chủ community dùng agent điều khiển hệ thống qua MCP
- **Không đối thủ nào có** — Whop/Skool chỉ là platform thụ động

### 2.3 Custom domain cho enterprise, data vẫn chung
- Skool + Whop KHÔNG cho phép custom domain cho community owner
- focus.camp enterprise tier cho phép → vẫn listing cross-community qua Discovery

---

## 3. Skool — deep dive

### 3.1 Skool là gì
Community + classroom platform. Cổng community với leaderboard, courses,
chat đơn giản, gamification nhẹ (level, points).

### 3.2 Mô hình giá
- **$99/month flat fee** cho chủ community + 2.9% transaction fee
- Không free tier → barrier cao cho community mới
- Student side: free để join một số community, paid tùy community

### 3.3 Tính năng chính (lấy hết gì có thể)
| Module | Mô tả | focus.camp status |
|---|---|---|
| Community / Classroom tabs | 2 tab chính: Community (feed) + Classroom (courses) | ✅ Feed + Courses đã tách module |
| Feed với pinning + categories | Admin pin bài, user filter theo category | ✅ Pin + Pillar filter |
| Level / Points per-community | Mỗi user có level + points riêng cho từng group | ✅ Membership.xp/level per-community |
| Activity heatmap | GitHub-style grid | ✅ Profile heatmap 12mo |
| Leaderboard per-community | Weekly / All-time | ✅ Per-challenge + per-community |
| Courses with modules + lessons | Video + text + task submission | ✅ Đã có schema + UI |
| Chat (simple) | 1 channel per community, không thread | ✅ Có (phase 2: thread + realtime) |
| Events / Calendar | Scheduled events, RSVP | ❌ Chưa có |
| Memberships (free/paid/tiers) | Tier-based access | 🟡 Schema có, UI chưa |
| About page per community | Landing page for guests | 🟡 Basic |
| Community Settings (Skool layout) | Sidebar tabs: Profile / Affiliates / Payouts / Account / Notifications / Chat / Payment methods / Payment history | 🟡 Settings page có, tabs Skool-style chưa |
| Affiliates | Creator's affiliate link + 40% commission stat | ❌ Schema có (AffiliateLink), UI chưa |
| Profile: followers/following + contributions | Skool có social graph | 🚫 Follow system = Phase 2 |
| Notifications bell | ✅ Đã có |
| Multi-community member switcher | Một user join nhiều → chuyển nhanh | ✅ Community list left rail |

### 3.4 Skool profile (image user shared)
Skool profile card: Avatar | Name + handle | Bio | Active Xh ago | Joined
date | **Contributions / Followers / Following** counts | Edit profile
button | **Activity heatmap 12mo** | **Owned by [name]** section (communities
user owns with VIEW button) | **Memberships** grid (communities user
joined as icon + name + member count + price).

**Mapping:**
- ✅ Avatar, name, handle, bio, joined, active-ago: done
- ✅ Heatmap 12mo: done
- ✅ Memberships grid: done ("Cũng active ở N cộng đồng")
- ✅ Contributions count: done (posts + comments + checkins)
- ❌ Followers / Following: Phase 2 (needs Follow model)
- ❌ Time-range filter (All/30d/7d): Phase 2

---

## 4. Whop — deep dive

### 4.1 Whop là gì
Marketplace + platform cho creators bán **mọi loại digital products**.
Tất-cả-trong-một: storefront + community + courses + Discord integration
+ payment processing. Slogan: "Sell anything online".

### 4.2 Mô hình giá
- **Free for creators to start** (không fee hàng tháng)
- Chỉ ăn % khi creator kiếm được:
  - Transaction fee 3% (trên Discord/Telegram/TradingView automations)
  - Payment processing 2.7% + $0.30 (card)
  - Marketplace fee: 0% (đã bỏ 30% để cạnh tranh)
  - Enterprise licensing
  - Whop Treasury: 6% APY trên USDT balances (layer 2026)
  - Ads revenue trong Discover marketplace

### 4.3 Cấu trúc "whop" = lego modules
Creator chọn modules cần → tùy chỉnh storefront → bán:
💬 Chat · 🎥 Livestreams · 💭 Forums · 📚 Courses · 🎬 Content Rewards
(clip earnings) · 📁 Files (downloadables) · 📅 Calendar bookings ·
📄 Content (articles) · 🤖 Discord/Telegram bots

### 4.4 11 loại sản phẩm bán trên Whop
1. **Paid Discord Communities** ⭐ (flagship) — role/channel access via Discord
2. **Paid Telegram Groups**
3. **Trading/Signals Services** (options alerts, crypto signals)
4. **Online Courses**
5. **Coaching / Mentorship** (1-on-1, group, calendar)
6. **Digital Downloads** (ebooks, templates, PDFs)
7. **SaaS & Tools** (scripts, bots, extensions, AI tools)
8. **Memberships / Subscriptions**
9. **Podcasts & Newsletters** (paid)
10. **Community/Forum Access**
11. **Clips/UGC Earnings** (creators earn from short-form)

### 4.5 Whop features roadmap — lấy hết, tái ngữ cảnh challenge

**Tier 1 — Core (MVP, build ngay)**
| Whop feature | focus.camp version | Challenge context |
|---|---|---|
| Paid community | ✅ Đã có | Entry gate vào challenges |
| Chat module | ✅ | Support channel cho challenge |
| Courses (E-Learning) | ✅ | "Learning power-up" mua để pass challenge |
| Challenges (Expeditions) | ✅ | **CORE — USP** |
| Marketplace (digital products) | ✅ | "Item shop" — templates, tools, SOP packs |
| Subscriptions | 🟡 | Membership tiers cho challenge tier cao |
| Payment (SePay/Stripe) | ✅ placeholder | Transaction layer |

**Tier 2 — Engagement & Retention**
| Whop feature | focus.camp version | Challenge context |
|---|---|---|
| Forums / Bảng tin | ✅ | Discussion per challenge + pillar |
| Livestreams | ❌ | Live coaching trong challenge |
| Calendar bookings | ❌ | 1-on-1 mentor cho challenger |
| Files (downloadables) | 🟡 | Template packs cho challenge |
| Leaderboard | ✅ | Cross-challenge ranking |
| Content Rewards (UGC) | ❌ | **Challenge bounty**: admin treo task, member nộp content → earn |
| Telegram/Zalo integration | ❌ | Notification + agent channel |

**Tier 3 — Premium / Enterprise**
| Whop feature | focus.camp version | Challenge context |
|---|---|---|
| Discord integration | ❌ | Bridge cho community có Discord sẵn |
| Discover marketplace | 🟡 (Discovery route có) | **Listing cross-community** |
| Clips/UGC earnings | ❌ | Challenger clip viral → earn bonus |
| Merchant of Record | ❌ | Tax compliance for international |
| Bundle products | ❌ | "Challenge starter pack" = course + template + tool |
| Affiliate program | 🟡 (schema có) | Challenger rủ bạn → commission |
| Custom domain | ❌ | **Enterprise tier USP** |
| White-label | ❌ | Enterprise option |
| API access | ❌ | Cho agencies/enterprise |
| Whop Treasury / APY | 🚫 | Maybe "challenge reward pool" sau |

**Tier ★ — AI Agent Layer (USP riêng)**
| Agent | Role |
|---|---|
| Learning Agent | Kèm user từng bài, context-aware, nhớ lịch sử |
| Challenge Coach | Theo dõi progress, nudge khi miss, suggest next action |
| Community Manager | Admin dùng qua MCP: bulk approve, auto-reply, moderate |
| Discovery Agent | Recommend challenges/courses phù hợp user |
| Telegram/Zalo Bridge | Support ngoài platform |

---

## 5. Challenge-centric re-framing

### Marketplace → "Item Shop"
Không phải "digital products chung chung" như Whop. Mỗi product có field
**"dùng cho challenge nào"** → cross-link trong challenge detail:
- Templates cho challenge cụ thể ("Funnel Template cho Funnel 21 Ngày")
- SOP Packs ("SOP Hoá Delivery — cần cho Ship First Thing")
- Tools/Extensions (Notion templates, Prompt packs)
- Power-up bundles ("Starter pack Beginner" = 3 templates + 1 mini course)

### Courses → "Skill Tree"
Không phải "khóa học riêng lẻ":
- Gắn vào **Pillar system** (Offer/Traffic/Conversion/Delivery/Continuity)
- Challenge có prerequisite skill → mua/complete course để unlock
- **Skill tree UI** — visual map của course cần master

### Subscriptions → "Membership Tier"
Không phải "pay monthly for content":
- **Explorer** (free) — 1-2 easy challenges
- **Builder** (paid) — full challenges + courses
- **Pro** — premium challenges + 1-on-1 mentor
- **Enterprise** — custom domain + white-label

---

## 6. TAIP.IO — feature inheritance (the old system)

Gốc: Laravel 12 + Livewire 3 + Alpine + Tailwind v4 + Postgres 17.
Chỉ kế thừa những gì không mâu thuẫn với multi-tenant config model:

### Auth & Onboarding
- Đăng ký/đăng nhập (✅ dùng NextAuth Google)
- **Chọn class khi onboarding** (5 class tùy chỉnh) → ✅ done với classesConfig
- Referral system → schema có, UI chưa

### Membership (gated access)
- Trả phí theo tuần (1w/4w/5w/52w) → giá giảm theo gói dài
- Status: trial → active → expired → banned
- Middleware chặn khi hết hạn
- Tích hợp SePay webhook → ✅ có

### Content system
- Feed tabs: Latest / CỐT / Popular / theo Pillar / Signals → ✅ Latest+Popular done, per-Pillar done, CỐT/Signals done
- Posts: text + ≤4 ảnh, pillar + topic tag → 🟡 text/pillar ✅, ảnh/tag chưa
- Signals: bài ngắn ≤500 từ, feed riêng → ✅
- CỐT: bài tinh hoa, user level ≥30 đề cử → admin duyệt → 🟡 admin toggle ✅, user-nominate chưa
- Q&A với best answer + ẩn danh + trả phí AIP → ✅ best answer, anon/bounty chưa
- Like, Comment (nested), Bookmark, Search → ✅ like/nested, ❌ bookmark/search

### Gamification Engine (configurable)
- **Classes**: 5 archetype tùy chỉnh → ✅ classesConfig
- **Pillars**: 5 trụ cột → ✅ pillarsConfig
- **XP System**: config-driven base XP + streak multiplier (7d=1.1x, 30d=1.2x, 90d=1.5x) → 🟡 schema có, logic chưa
- **Level System**: 1–300 levels, bảng XP lũy tiến MapleStory-style → 🟡 Membership.level có, bảng XP chưa
- **AIP**: currency phụ → ✅ gemsConfig
- **Đá Không Cực 💎** (rare gem admin trao) → ❌ (gemsConfig có secondary currency field sẵn cho cái này)
- **Rune**: 2x XP cho comment đầu tiên trong time window → ❌
- **Power Symbols**: tiến trình theo pillar → ❌
- **Badges**: achievement auto (level/post/streak/gem count) rarity common→legendary → 🟡 schema có, logic chưa
- **Streak**: ảnh hưởng XP multiplier → ✅ counter, ❌ multiplier logic

### Expeditions (group challenges)
- Name, boss, difficulty (normal/hard/chaos), days, max members, deposit AIP → ✅ schema; **Boss đã wire visual (Boss Sói)**
- Leader + member mgmt, kick, approval → 🟡 approval ✅, kick ❌
- Daily tasks với evidence (text/screenshot), SOP, video → ✅
- Check-in hàng ngày + evidence → ✅
- Freeze windows → ❌ (schema có freezeFrom/freezeStartsAt/freezeEndsAt)
- XP bonus: difficulty multiplier + class diversity (3+ class=1.2x, 5+=1.5x) → ❌
- Lifecycle: pending_approval → open → active → completed/failed/cancelled → 🟡 partial

### Academy
- Courses với pillar, difficulty (basic/advanced/expert), min level, XP/AIP reward → ✅ schema, UI basic
- Modules → Lessons (video/text/task với text/link/file/quiz) → 🟡 Lessons có, Modules (grouping) chưa
- Submission workflow: pending → approved/rejected → ❌
- Prerequisites (lesson khoá, cần hoàn thành bài trước) → ❌

### Marketplace
- Digital products, free hoặc trả phí → ✅
- Filter theo pillar → 🟡
- Purchase history → ✅
- Instant delivery cho free → ✅

### Messaging & Notifications
- DM 1-1 rate limited → ❌ (chỉ có chat community-channel)
- Notifications bell dropdown → ✅ done vừa xong

### Leaderboard & Analytics
- Weekly/Monthly/All-time/Đá Không Cực leaderboard → 🟡 per-challenge có, global chưa
- Pillar stats: % bài viết theo pillar 7 ngày, burning zone indicator → ❌
- Sidebar widgets: My XP, Top 5, Burning Zone, Challenge progress → 🟡 Active Challenge widget có

### Affiliate
- Link referral riêng, commission 20% → 🟡 schema AffiliateLink có, UI chưa

### Profile
- Avatar, bio, username, level, XP, AIP, streak, class → ✅
- Tabs: posts / challenges / courses → 🟡 posts tab có, challenges/courses tabs chưa
- XP transactions log, badge collection, bookmarks → ❌

### Admin Panel
- Dashboard: user/post counts, pending reports, pending CỐT → ❌
- Users search, toggle admin/mod, ban/unban → 🟡 members editor có role change, ban/unban ❌
- Topics CRUD → ✅ pillars/classes là phiên bản per-community
- CỐT review, Challenges tạo/sửa, Courses/Products quản lý → 🟡 partial
- Reports (vi phạm) → ❌

### Integrations
- SePay webhook → ✅
- Bot API (member lookup, challenge progress) → ❌
- Telegram notification → ❌
- Multi-brand (resolve brand qua middleware) → 🟡 multi-tenant per-community thay thế

---

## 7. Đã làm vs. chưa làm — quick tally

**Foundation ready (platform working):**
Auth + NextAuth, multi-tenant config (pillars/classes/currency/levels),
post/comment/reaction system, community/membership, courses/lessons,
marketplace/purchase/SePay, challenges/check-in/streak/leaderboard,
profile + heatmap, settings + members, notifications, CI/CD.

**Challenge module gaps (from spec):**
- Voting on submissions (new CheckinVote model) — IN PROGRESS
- Admin CRUD tasks inline
- Resubmit after reject
- Freeze mechanics
- Video feedback review
- XP award logic with streak multipliers
- Class diversity bonus

**TAIP features ported:**
- Bookmarks, Power Symbols, Rune, Đá Không Cực trao thưởng, Badges auto-award,
  DM, Admin dashboard, Reports, Pillar stats, Topic tags per-post, Course
  modules grouping, Prerequisites, Level table 1-300, Affiliate UI

**Whop inspiration (not yet built):**
- Livestreams, Calendar bookings, Files module, Content Rewards (UGC
  bounty), Telegram/Zalo bridge, Discord integration, Bundle products,
  Custom domain for enterprise, Clips/UGC earnings

**Skool inspiration (not yet built):**
- Events/Calendar, Follow system, Skool-style settings tabs layout,
  Global social graph stats, Time-range filter on profile heatmap

**AI Agent (USP — not yet built):**
- All 5 agent types (Learning / Challenge Coach / Community Manager /
  Discovery / Telegram-Zalo Bridge)

---

## 8. Priority order (next sprints)

See `docs/roadmap.md` for working priority. TL;DR:

1. **Sprint A** — finish Challenge spec: voting, task CRUD, resubmit, freeze
2. **Sprint B** — discovery + search + keyboard shortcuts
3. **Sprint C** — community CRUD flows (create community, CRUD courses/
   challenges/products inline by admin)
4. **Sprint D** — AI Agent (user wants careful brief)
5. **Phase 2** — Follow/Bookmark, realtime, avatar upload, DMs, livestreams
