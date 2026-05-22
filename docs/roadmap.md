# focus.camp — Roadmap & Module Spec

_Updated: 2026-05-18. Source of truth for "what's shipped / what's next"._

## Positioning

focus.camp là platform multi-tenant cho creators build community có **triết lý chọn lửa** (Direct Challenge), chia thành viên theo **class riêng mỗi community**, level qua XP, thưởng qua currency có tên riêng. Nguyên tắc Skool: reputation **per-community**, không cross.

## Shell terminology

Shortcuts:
- **Điểm tập kết** = home area (`/`, `/discovery`, `/about`, `/brand`, `/direct-challenge`, `/inbox`). Sidebar: `HomeSidebar`.
- **Community** (`/c/[slug]/*`) = per-community shell. Sidebar: channel-sidebar.
- **Right sidebar** = parallel route `@rightSidebar` with `default.tsx` fallbacks per AGENTS.md.

---

## Module status matrix

Key: ✅ done · 🟡 partial · ❌ not started · 🚫 deferred (Phase 2+)

### Core identity & auth
| Item | Status | Notes |
|---|---|---|
| Google SSO (NextAuth v5, Prisma adapter, database strategy) | ✅ | |
| User profile (bio, handle, location, avatar) | ✅ | Avatar: only Google SSO image; upload = Phase 2 |
| Edit profile modal | ✅ | |
| Community-scoped profile view | ✅ | `/c/<slug>/profile/<userId>` |
| Activity heatmap (12mo) | ✅ | per-community |
| Stats: active days / current + longest streak / peak hour | ✅ | |
| "Cũng active ở N cộng đồng" (Skool-style, no stats leak) | ✅ | |
| XP log on profile (last 12 XPLedger events) | ✅ | |
| Follower / Following counts + Follow button | ✅ | Shown on /u/ and /c/<slug>/profile |
| Platform super admin flag + platform orders | ✅ | `User.isSuperAdmin`; `/admin/orders` for focus.camp community-plan payments |
| Time-range filter on stats (All/30d/7d) | ❌ | Phase 2 |
| Follow system (for Feed "Following" tab) | ✅ | Shipped |
| Bookmark system | ✅ | 🔖 button + Feed Bookmarked tab |

### Community platform
| Item | Status | Notes |
|---|---|---|
| Community create/join/list | ✅ | CreateCommunityButton (+ icon in ServerList) |
| Join flow picks class when `classesConfig` set | ✅ | Modal |
| Right sidebar: guest/member views | ✅ | |
| Boss Sói gamification (HP/tagline/name, computed from activity) | ✅ | Per-community |
| Admin Settings: pillars/classes/currency/levels CRUD | ✅ | |
| Settings: member list + role change + remove | ✅ | |
| Role permissions: OWNER / ADMIN / MOD / MEMBER | ✅ | `docs/roles-permissions.md` + `lib/community-permissions.ts`; admin has full community settings edit access except community deletion, mod reviews submissions + moderates |
| Settings: challenge-level toggles (requiresApproval, freeze) | ✅ | ChallengeSettingsPanel |
| Notifications inbox + bell badge + 6 emitters | ✅ | Global inbox; bulk mark-read / clear-read / clear-all; keeps 42 newest/user, prunes read after 14d and unread after 30d |
| Bell badge live polling (30s, pause on hidden tab) | ✅ | `/api/notifications/unread-count` |
| Feature unread badges (Feed/Q&A/Signals/CỐT) | ✅ | Last-viewed per feature; Chat unread deferred |
| Real-time push (SSE / WebSocket) | 🚫 | Phase 2 — polling works for now |

### Feed / Bảng tin
| Item | Status | Notes |
|---|---|---|
| Hook to DB, composer inline | ✅ | |
| Pillar filter (from community config) | ✅ | |
| Reactions (heart) optimistic | ✅ | |
| Pin / Cốt mark (admin) | ✅ | |
| Post edit / delete | ✅ | Menu ⋯ |
| Share URL copy | ✅ | |
| Pagination "Xem thêm" | ✅ | cursor-based |
| Sort: Latest / Popular | ✅ | Popular = reactions + comments DESC |
| Sort: Following / Bookmarked tabs | 🚫 | Phase 2 — requires Follow/Bookmark |
| Post detail page + comments | ✅ | `/c/<slug>/p/<id>` |
| Comment nested replies (cap depth 3) | ✅ | |
| Comment edit / delete / mark best answer | ✅ | |

### Cốt / Q&A / Signals (reuse Post)
| Item | Status | Notes |
|---|---|---|
| Cốt: filter `isCot=true`, admin toggles via feed | ✅ | |
| Q&A: Post type=QUESTION, composer requires title | ✅ | |
| Signals: Post type=SIGNAL, admin-only composer | ✅ | |
| Bounty AIP / custom currency on Q | ✅ | |
| AI auto-answer on Q&A | 🚫 | Part of AI Agent |

### Challenges (module-challenges.md)
| Item | Status | Notes |
|---|---|---|
| CRUD expedition/challenge (admin) | ✅ | Create challenge + tasks (edit/delete) all via UI |
| User join (direct ACTIVE) | ✅ | |
| Admin approve member requests | ✅ | `requiresApproval` flag |
| UI toggle `requiresApproval` in challenge settings | ✅ | ChallengeSettingsPanel |
| Daily task unlock by day | ✅ | |
| User checkin + evidence (text/link/image/text+image) | ✅ | |
| Streak calc + per-challenge leaderboard | ✅ | |
| Admin review submission (approve/reject + note) | ✅ | Phase C |
| `approveAllPending` bulk | ✅ | |
| Voting on submissions | ✅ | CheckinVote model + 👍 pill |
| Video feedback submit + review | ❌ | Phase 2 |
| Resubmit after reject (with rejectCount cap) | ✅ | Cap at 2, note preserved |
| Admin CRUD tasks inline | ✅ | TaskEditorButton + CreateTaskButton + delete |
| Freeze mechanics (pause timer) | 🟡 | UI + banner shipped; day-count adjustment = Phase 2 |
| **XP award system** (+5/post, +2/comment, +5×mult/checkin, +10/approve+best) | ✅ | awardXp + XPLedger persisted |
| **Streak multipliers** (7d=1.1x, 30d=1.2x, 90d=1.5x) | ✅ | bumpCommunityStreak + applied to CHECKIN |
| **Community-wide leaderboard** (All/Monthly/Weekly) | ✅ | XPLedger groupBy for time-bucketed ranks |
| Community-wide weekly challenge (CommunityChallenge schema) | 🚫 | Phase 2 |

### Courses / Marketplace
| Item | Status | Notes |
|---|---|---|
| Course list + detail + lesson player | ✅ | |
| Marketplace list + detail | ✅ | |
| Purchase via SePay webhook | ✅ | |
| Course progress tracking | ✅ | |
| Admin create course + draft visibility | ✅ | CreateCourseButton, owner sees unpublished |
| Admin create lesson inside course | ✅ | CreateLessonButton |
| Admin create product | ✅ | CreateProductButton |
| Admin edit/delete course/lesson/product | 🟡 | Services ready, UI Phase 2 |
| Free vs paid gating | ✅ | via `Product.isFree` |
| Cart item removal + cart bump add-on | ✅ | Cookie cart; free bump add-on supported |

### Chat
| Item | Status | Notes |
|---|---|---|
| Channels per community | ✅ | |
| Send message | ✅ | |
| Real-time WebSocket / SSE | 🚫 | Phase 2 — currently polls on refresh |
| Message edit/delete/react | 🚫 | Phase 2 |
| DMs | 🚫 | Phase 2 |

### AI Agent
| Item | Status | Notes |
|---|---|---|
| Agent hub page (mockup, 6 agent cards) | ✅ | Static |
| Chat UI + streaming via Vercel AI SDK | ❌ | User brief khi tỉnh táo |
| System prompts per agent (Learning Coach / Challenge Coach / …) | ❌ | |
| MCP for Community Manager agent | ❌ | |
| Telegram/Zalo bot integration | ❌ | |

### Search
| Item | Status | Notes |
|---|---|---|
| Global search (posts + users + communities) | ✅ | `/search` — Postgres `contains` MVP. tsvector = Phase 2 |
| Cmd+K shortcut | ✅ | Also `g h / g i / g d` for home / inbox / discovery |
| `/u/<handle>` global profile landing | ✅ | Chips only, no cross-community stats (Skool pattern) |
| Discovery featured communities/challenges | ✅ | Communities list all matches with verified pinned first, ordered by member count; challenges reuse `featuredOnGlobal`; 9-per-page pagination |
| Discovery search/filter URL UX | ✅ | Search commits on Enter; category dropdown temporarily hidden; `q/section` preserved by links |

### Shared infra
| Item | Status |
|---|---|
| Next.js 16 App Router, React 19, Prisma 6, Postgres | ✅ |
| Multi-tenant JSON configs on Community | ✅ |
| Middleware auth + security headers | ✅ |
| Zod validation layer | ✅ |
| Pino logger + Sentry | ✅ |
| R2 media upload + cleanup on replace/delete | ✅ |
| CI: GH Actions → GHCR → VPS pull | ✅ |
| VPS: 4GB swap, Caddy reverse proxy, docker compose | ✅ |
| DB backup cron | ✅ |

---

## Next sprint priorities

**Sprint A — Challenge polish** (finish module-challenges.md spec):
1. Toggle `requiresApproval` in challenge settings UI
2. Voting on submissions (CheckinVote model)
3. Admin CRUD tasks inline (edit day/title/description/evidenceType per task)
4. Resubmit after reject (rejectCount cap at 2)
5. Freeze mechanics (admin sets freezeFrom, timer pauses)

**Sprint B — Discovery & search** (reduce friction):
1. Global search (posts + users + communities) — ilike MVP
2. Keyboard shortcut Cmd+K open search
3. Command palette inside search (go to community, create post, etc.)

**Sprint C — Community expansion**:
1. Community create flow (currently DB-only)
2. Community banner/icon upload (needs object storage)
3. Admin CRUD courses + lessons inline
4. Admin CRUD challenges + tasks inline

**Sprint D — AI Agent** (user brief carefully):
1. Streaming chat UI
2. Per-agent system prompt in DB
3. Tool calling for Challenge Coach (check user's streak, suggest action)
4. Telegram bot relay

**Deferred (Phase 2)**:
- Real-time push (SSE for notifications, WebSocket for chat)
- Follow / Bookmark systems
- Avatar + community icon upload
- DMs
- Video feedback flow for challenges
- Payment-gated resubmit
