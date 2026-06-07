# scaleup-plan-focuscamp

Audit date: 2026-06-07  
Scope: plan update code va ha tang de focus.camp scale duoc theo huong multi-instance production.  
Artifact target: tai lieu nay danh cho ca nguoi doc va AI Agent tiep tuc trien khai.

## 1. Tom Tat Dieu Hanh

focus.camp hien da co nen tang san pham kha day: multi-tenant community, challenge-first, course, marketplace, gamification, AI Agent/MCP, thanh toan SePay, upload R2/S3, NextAuth, Prisma/Postgres va Redis/BullMQ tuy chua duoc bat buoc o production.

Kha nang scale hien tai: tot cho early production/single VPS, nhung chua an toan neu chay multi-instance hoac traffic cao. Van de khong nam o viec thieu framework, ma nam o 6 diem can chot truoc khi nhan traffic:

1. Ha tang dang gan voi mot VPS/compose stack, app + DB + Redis o cung cum.
2. Nhieu truy van dong, layout/page hot path chua co cache va chua co day du index/counter.
3. Realtime/chat/notification con lai polling hoac refresh page o nhieu flow.
4. Rate limit, worker, queue con co fallback in-memory, khong replica-safe.
5. Mot so permission/security gap can fix truoc khi scale, vi scale se khuech dai loi.
6. Service layer chua dong nhat, van co action/page goi Prisma truc tiep o cac vung rui ro.

Muc tieu cua plan nay la dua du an len trang thai:

- Chay duoc nhieu app replicas sau load balancer.
- DB/Redis co the tach ra managed service hoac VPS rieng.
- Cache/counter/index giam tai cho route hot path.
- Chat/notification realtime bang SSE v1, WebSocket de sau.
- Permission duoc service-side enforce, khong phu thuoc UI hide button.
- Worker/cron/queue la singleton va co duong deploy ro rang.

## Doc Nhanh: Lam Gi Truoc?

Lam truoc **Phase 1 - Security Fixes First**, ten PR de xuat la `security-service-hardening`.

Ly do: neu scale ha tang truoc khi khoa quyen, cac loi permission se bi nhan len tren nhieu app replicas. Luc do user co the bypass bang API/action truc tiep du nhanh hon, kho trace hon, va kho rollback hon. Vi vay viec dau tien khong phai them server, ma la dong cac cua co the bi bypass.

PR dau tien can fix 7 diem:

1. Chat send/stream phai check ACTIVE membership va channel belongs to community.
2. Report resolve phai load bang `reportId`, derive community tu DB, khong tin `communityId` client dua vao.
3. API key request phai revalidate current member role/status sau khi user bi demote/remove.
4. `updateMemberRole` phai bao ve owner row, khong cho admin/mod/action truc tiep demote owner.
5. Best-answer permission phai canh thang UI va service.
6. Product purchase phai enforce membership/access trong service, khong chi o UI.
7. Challenge AIP payment phai verify challenge-community relation.

Lam xong PR nay thi moi qua thu tu tiep theo:

1. Redis required + distributed rate limit.
2. DB indexes + counters + cache.
3. Realtime SSE cho chat/notifications.
4. Worker/cron split.
5. Multi-instance deploy.

Noi ngan gon: **khoa cua truoc, roi moi mo them nha**. Trong ngon ngu engineering: secure service boundaries first, then scale infrastructure.

## 2. Ranh Gioi Va Gia Dinh

Khong lam trong plan nay:

- Khong viet lai san pham, khong doi Next.js/App Router architecture.
- Khong dua len Kubernetes ngay tu dau.
- Khong doi database khoi Postgres.
- Khong doi thanh toan SePay.
- Khong sua roadmap docs neu chua ship code.

Gia dinh:

- Target scale la multi-instance production vua va lon, khong phai enterprise overbuild.
- Co the dung managed Postgres/Redis/R2 neu chi phi cho phep.
- SSE la du de scale giai doan dau cho notification/chat; WebSocket chi can khi co typing, presence realtime day du, voice, collaborative editing.
- Tai lieu nay se duoc tach thanh PR/phase nho, moi phase co verify rieng.

## 3. Kien Truc Muc Tieu

```text
User
  |
  v
Cloudflare / WAF / TLS / cache static
  |
  v
Load Balancer
  |
  +--> Next.js app replica A
  +--> Next.js app replica B
  +--> Next.js app replica N
          |
          +--> Managed Postgres / primary DB
          +--> Managed Redis / cache + pubsub + queue + rate limit
          +--> R2/S3 object storage
          +--> Sentry / structured logs / uptime monitor

Singleton workers
  |
  +--> BullMQ queues
  +--> cron jobs
  +--> AI review jobs
  +--> notification fanout
```

Nguyen tac:

- App replicas stateless.
- Redis la bat buoc o production, khong fallback in-memory cho rate limit/realtime critical path.
- Worker khong tu dong start trong moi app replica.
- DB migration chay mot lan moi deploy.
- Cron chay qua API/queue/worker, khong phu thuoc scripts nam trong Docker standalone image neu image khong copy scripts.

## 4. Sau Track Scale Chinh

### Track 1 - Multi-Instance Infrastructure

Van de hien tai:

- `docker-compose.yml` gom app, Postgres 16, Redis 7 trong cung stack.
- Deploy GitHub Actions SSH vao VPS roi compose up.
- Docker standalone image co nguy co khong co `scripts/`, trong khi cron/backup/maintenance co nhac toi scripts.
- Worker co nguy co start theo runtime cua Next app neu dat trong instrumentation/runtime path.
- DB/Redis dang co kha nang expose/noi chung chua tach production/dev ro.

Muc tieu:

- App co the scale `replicas: 2+`.
- DB/Redis tach duoc khoi app stack.
- Healthcheck chia live/readiness.
- Deploy immutable theo image tag/SHA.
- Cron/worker singleton, khong chay lap tren moi replica.

File/area can xem:

- `Dockerfile`
- `docker-compose.yml`
- `.github/workflows/deploy.yml`
- `instrumentation.ts`
- `app/api/health/route.ts`
- `scripts/backup-db.sh`
- `scripts/init-prisma-migrations.sh`

Viec can lam:

1. Tach compose:
   - `docker-compose.yml` cho local/dev.
   - `docker-compose.prod.yml` cho production app-only hoac app + external network.
   - DB/Redis production dung external service hoac compose rieng khong expose public port.
2. Them env production:
   - `DATABASE_URL` qua pooler neu dung managed Postgres.
   - `DIRECT_DATABASE_URL` cho Prisma migrate neu provider can direct connection.
   - `REDIS_URL` bat buoc.
   - `REQUIRE_REDIS=true` o production.
   - `WORKER_ENABLED=false` cho app replicas.
   - `WORKER_ENABLED=true` chi cho worker service.
3. Doi health:
   - `/api/health/live`: process alive, khong hit DB.
   - `/api/health/ready`: check DB + Redis + env critical.
   - Giu `/api/health` neu uptime monitor dang dung, nhung map ro status.
4. Deploy:
   - Build/push GHCR image theo SHA.
   - SSH server pull dung image tag, khong build tai VPS neu da co GHCR.
   - Chay `prisma migrate deploy` mot lan truoc app rollout.
   - Roll app replica tung node hoac tung service.
5. Cron:
   - Chuyen cron scripts thanh API route co auth noi bo hoac BullMQ repeatable jobs.
   - Neu giu script, dam bao Docker image copy `scripts/` va co binary can thiet.
6. Backup:
   - Backup DB tu DB host hoac container backup rieng.
   - Khong phu thuoc app container.
   - Luu encrypted/offsite, retention ro.

Acceptance:

- Co the chay 2 app containers cung tro vao 1 DB/Redis ma login/session/rate-limit/notification khong lech.
- Health ready fail neu Redis/DB chet.
- Worker chi co dung 1 process active.

### Track 2 - Database, Query, Counter, Cache

Van de hien tai:

- Next `cacheComponents` chua duoc bat.
- Nhieu page/layout hot path query dong theo user/community.
- Feed/discovery/challenge/course/notification co nguy co quet/aggregate nhieu khi traffic tang.
- Mot so counter dang tinh bang query thay vi denormalized counter.
- Presence scan Redis keys theo pattern co the ton CPU khi user lon.

Muc tieu:

- Hot path co index dung query shape.
- Counter doc nhanh, ghi dual-write trong service/action.
- Cache Redis cho shell/layout/discovery/list hot path.
- Invalidate theo event/mutation ro rang.

File/area can xem:

- `prisma/schema.prisma`
- `lib/prisma.ts`
- `lib/redis.ts`
- `lib/cache.ts` neu co
- `lib/services/community.ts`
- `lib/services/feed.ts`
- `lib/services/notification.ts`
- `app/(shell)/layout.tsx`
- `app/discovery/page.tsx`
- `app/c/[slug]/layout.tsx`
- `app/c/[slug]/page.tsx`
- `app/c/[slug]/challenges/*`
- `app/c/[slug]/marketplace/*`

Index uu tien can danh gia/them migration:

```prisma
// Ten index minh hoa. Can doi theo model/field thuc te trong schema.
Membership:      @@index([userId, joinedAt])
Membership:      @@index([communityId, role, status])
ChallengeMember: @@index([userId, status, joinedAt])
Challenge:       @@index([communityId, status, createdAt])
Product:         @@index([communityId, visible, type, createdAt])
Course:          @@index([communityId, published, createdAt])
Post:            @@index([communityId, type, createdAt])
Post:            @@index([communityId, type, score, createdAt])
Comment:         @@index([postId, createdAt])
Checkin:         @@index([challengeId, status, createdAt])
Payment:         @@index([paymentCode])
Payment:         @@index([userId, status, createdAt])
Notification:    @@index([userId, readAt, createdAt])
ApiKey:          @@index([communityId, active])
```

Counter/cached fields can them neu chua co:

- `Post.commentCount`
- `Post.reactionCount`
- `Post.bookmarkCount` neu UI can popular/bookmark count.
- `Challenge.participantCount`
- `Challenge.pendingSubmissionCount`
- `Course.lessonCount`
- `Product.purchaseCount`
- `Notification.unreadCount` nen uu tien Redis counter hon DB field.

Cache keys de xuat:

```text
shell:user:{userId}:communities
community:{slug}:summary
community:{id}:features
community:{id}:right-sidebar:{userId|guest}
discovery:communities:{hash(filters)}
feed:{communityId}:{tab}:{cursor}
challenge:{communityId}:review-counts
marketplace:{communityId}:products:{hash(filters)}
notifications:{userId}:unread-count
presence:community:{communityId}
```

Invalidation:

- Community update -> clear `community:{id|slug}:*`, shell community lists for affected users.
- Membership join/leave/role update -> clear shell + community access cache + permission cache.
- Post/comment/reaction/bookmark -> clear feed keys for community, update counters.
- Challenge join/checkin/review -> clear challenge detail/list/review count.
- Product/course publish/update -> clear marketplace/course list.
- Notification create/read -> update Redis unread counter and publish SSE event.

Viec can lam:

1. Audit slow query bang Prisma query log local/staging.
2. Them migration indexes theo query shape that, khong them tran lan.
3. Them counter fields tung domain, backfill script/migration.
4. Sua service mutation de dual-write counter trong transaction.
5. Them Redis cache helper:
   - `getJsonCache`
   - `setJsonCache`
   - `rememberJsonCache`
   - tag/key invalidation conventions.
6. Cache shell/discovery/community summary truoc, feed sau.
7. Doi presence tu scan key pattern sang sorted set/hash co expiry score.
8. Load test doc path sau moi dot.

Acceptance:

- Community shell va discovery query count giam ro tren repeated access.
- Feed list khong tinh aggregate nang tren moi request.
- P95 hot page tren staging duoi target sau khi warm cache.
- Redis down o production lam health ready fail, khong silently fallback.

### Track 3 - Realtime Chat And Notifications

Van de hien tai:

- Notification da co SSE/Redis pubsub scaffolding:
  - `lib/realtime.ts`
  - `app/api/notifications/stream/route.ts`
  - `components/shell/notif-badge.tsx`
- Chat van nghieng ve server action + refresh.
- `sendMessage`/chat path can recheck membership/channel ownership service-side.
- Neu dung polling, traffic tang se dat ap luc len DB.

Muc tieu:

- Notification unread count realtime qua SSE.
- Chat message realtime qua SSE v1.
- API send message co auth/rate-limit/service validation.
- Client co pagination cursor, khong load sai oldest/newest.

File/area can xem:

- `lib/realtime.ts`
- `app/api/notifications/stream/route.ts`
- `components/shell/notif-badge.tsx`
- `app/actions/chat.ts`
- `lib/services/chat.ts`
- `app/c/[slug]/chat/*`
- `components/community/chat/*`

API de xuat:

```text
GET  /api/chat/channels/[channelId]/messages?cursor=...
POST /api/chat/channels/[channelId]/messages
GET  /api/chat/channels/[channelId]/stream
```

Event contract:

```ts
type RealtimeEvent =
  | {
      type: "notification.created";
      userId: string;
      notificationId: string;
      unreadCount: number;
      createdAt: string;
    }
  | {
      type: "notification.count";
      userId: string;
      unreadCount: number;
      updatedAt: string;
    }
  | {
      type: "chat.message.created";
      communityId: string;
      channelId: string;
      messageId: string;
      authorId: string;
      createdAt: string;
    };
```

Service contract:

```ts
sendChatMessage({
  actorUserId,
  channelId,
  content,
}): Promise<ChatMessageDto>
```

Bat buoc service check:

- User authenticated.
- Channel belongs to community.
- User la member ACTIVE cua community.
- User khong bi ban/muted neu model co.
- Content validate length/schema.
- Rate limit per user/channel/IP.
- Publish Redis event sau khi DB commit thanh cong.

Viec can lam:

1. Chuan hoa DTO chat message, tach Prisma payload khoi UI.
2. Tao API route send message thay vi tin vao hidden `channelId` trong form.
3. Tao stream route per channel.
4. Dung Redis pub/sub adapter trong `lib/realtime.ts`.
5. Cap nhat client chat append message realtime, fallback refetch khi reconnect.
6. Notification:
   - Dam bao unread counter doc tu Redis/DB sync.
   - Event count chay khi read all/read one.
7. Them rate limit Redis cho chat.
8. Test reconnect, duplicate event, permission denied, channel wrong community.

Acceptance:

- Hai tab/user thay message moi khong refresh.
- User bi remove khoi community khong stream/send duoc.
- 2 app replicas van nhan event qua Redis pub/sub.
- Khi SSE disconnect, client reconnect va refetch cursor de khong mat message.

### Track 4 - Redis, Rate Limit, Queue, Worker

Van de hien tai:

- `lib/rate-limit.ts` co in-memory fallback, khong dung khi multi-instance.
- BullMQ/Redis optional co the lam behavior khac nhau giua local/prod.
- Worker start path can bi nhan ban neu nam trong app runtime.
- Cleanup jobs/AI review/notification fanout can duoc gom vao singleton worker.

Muc tieu:

- Production bat buoc Redis.
- Rate limit distributed.
- Queue jobs idempotent.
- Worker la process/service rieng.
- Cron dua vao queue/API co auth noi bo.

File/area can xem:

- `lib/rate-limit.ts`
- `lib/redis.ts`
- `lib/queue.ts`
- `instrumentation.ts`
- `app/api/cron/*`
- `app/api/sepay/webhook/route.ts`
- `app/api/agent/chat/route.ts`
- `app/api/mcp/*`

Rate limit policy de xuat:

```text
SePay webhook:        60/min/IP + signature/token validation neu co
Auth/login:           10/min/IP + email based protection
Chat send:            30/min/user/channel
Post/comment create:  20/min/user/community
Upload:               30/hour/user
AI Agent chat:        quota + 20/min/admin/community
MCP/API key:          300/min/key tuy tier
Payment status poll:  120/min/user
```

Viec can lam:

1. Sua `lib/redis.ts`:
   - production neu `REQUIRE_REDIS=true` ma thieu Redis thi throw/fail readiness.
   - expose Redis client/publisher/subscriber rieng neu can.
2. Sua `lib/rate-limit.ts`:
   - Redis sliding window/token bucket.
   - local/dev moi duoc in-memory fallback.
3. Sua queue:
   - Them job names ro.
   - Idempotency key.
   - Retry/backoff/dead-letter conventions.
4. Tach worker:
   - `npm run worker` hoac `node dist/worker.js` tuy build.
   - Docker service `worker` dung cung image, command rieng.
   - `WORKER_ENABLED` khong de app replicas tu start.
5. Chuyen cron:
   - Cleanup notification/presence/payment expiry -> worker/queue.
   - AI review -> queue.
   - Backup -> infra job rieng.
6. Observability:
   - Log job start/success/fail duration.
   - Alert neu queue lag cao.

Acceptance:

- Tat Redis lam app production fail readiness.
- 2 replicas rate limit chung mot bucket.
- Chi mot worker consume singleton jobs.
- Retry job khong tao duplicate payment/notification/message.

### Track 5 - Security And Permission Hardening

Van de hien tai can fix truoc scale:

- Chat send action/service thieu membership/channel ownership recheck day du.
- Report resolution tin `communityId` caller dua vao truoc khi resolve bang `reportId`.
- API keys co nguy co con hieu luc sau khi user bi demote/remove.
- `updateMemberRole` service can owner-row protection, UI hide la chua du.
- Best-answer UI permission va service permission co the lech voi admin/mod.
- Product purchase membership enforcement co ve nang ve UI, service can check.
- Challenge AIP payment can verify thieu relation challenge/community.

Muc tieu:

- Moi mutating path critical co service-side authorization.
- Permission dua vao `lib/community-permissions.ts`.
- API key auth luon revalidate role/status tai thoi diem request.
- Khong tin `communityId`, `channelId`, `postId`, `challengeId` tu client neu co the derive tu DB.

File/area can xem:

- `lib/community-permissions.ts`
- `lib/services/chat.ts`
- `app/actions/chat.ts`
- `lib/services/reports.ts` hoac report actions/routes
- `lib/services/api-keys.ts`
- `app/api/mcp/*`
- `lib/services/payment.ts`
- `lib/services/challenge*.ts`
- `app/actions/community-settings.ts`
- `app/actions/qa.ts`

Fix list uu tien:

1. Chat authorization:
   - `sendMessage` derive community tu channel.
   - check ACTIVE membership.
   - check channel belongs to community.
2. Report resolution:
   - load report by `reportId`.
   - derive communityId from report.
   - verify actor permission in that community.
   - ignore caller-provided communityId or chi dung de assert match.
3. API keys:
   - hash key nhu hien tai neu da co.
   - moi request load key + owner/current member role/status.
   - reject if member removed/demoted below required permission.
   - optional: key scope and lastUsedAt async update.
4. Member role update:
   - khong cho update/remove owner row.
   - khong cho ADMIN demote OWNER.
   - owner transfer neu can thi flow rieng.
5. Best answer:
   - derive post/community from answer/comment id.
   - service permission source of truth.
   - align UI with service.
6. Purchase service:
   - product/community membership enforcement in `startProductPurchase`.
   - do not rely on disabled button/UI.
7. Challenge AIP:
   - verify challenge belongs to community.
   - verify actor/member can purchase/join.
   - payment product/challenge target cannot be mixed across community.

Testing:

- Unit tests cho permission helper.
- Integration tests cho service mutation bi deny.
- Regression tests cho API key after demotion/removal.
- Payment test wrong community/challenge relation.

Acceptance:

- Hidden fields manipulated tu client khong bypass duoc permission.
- Removed/demoted API key owner bi reject ngay request tiep theo.
- Owner row khong bi demote/delete boi admin/mod/action truc tiep.

### Track 6 - Service Layer Cleanup, Testing, Observability

Van de hien tai:

- Rule repo yeu cau business logic qua `lib/services/`, nhung mot so pages/actions van goi Prisma truc tiep.
- Khi scale, direct Prisma lam permission/cache/invalidation/rate-limit bi phan tan.
- Test coverage can tap trung vao service contracts va integration flow.

Muc tieu:

- UI/action/API chi lam auth/session parse, validate input, call service, revalidate/cache.
- Service la noi duy nhat enforce business rules.
- Cache invalidation va event publish nam gan mutation service.
- Co test/load-test de verify scale.

File/area can audit:

```powershell
rg "prisma\\." app components lib -g "*.ts" -g "*.tsx"
rg "getServerSession|auth\\(" app lib -g "*.ts" -g "*.tsx"
rg "revalidatePath|revalidateTag" app lib -g "*.ts" -g "*.tsx"
```

Service boundaries de xuat:

```text
lib/services/community.ts      membership, join, role, settings
lib/services/feed.ts           posts, comments, reactions, bookmarks
lib/services/chat.ts           channels, messages, stream auth
lib/services/challenge.ts      join, checkin, review, progress
lib/services/course.ts         courses, lessons, progress
lib/services/marketplace.ts    product CRUD, purchase eligibility
lib/services/payment.ts        start/match/status/payment target validation
lib/services/reports.ts        create/resolve/escalate reports
lib/services/notifications.ts  create/read/count/fanout
lib/services/api-keys.ts       issue/verify/scope/revoke keys
lib/services/shell.ts          sidebar/community list/right sidebar data
```

DTO rules:

- Service returns DTO needed by UI, khong leak raw Prisma object neu co sensitive fields.
- Input schema dung zod tu `lib/validations.ts`.
- Service receives `actorUserId`, not full client role object.
- Service derive community/resource relation tu DB.

Testing layers:

1. Unit:
   - permission matrix
   - validation schema
   - cache key helpers
2. Service integration:
   - membership/role/report/chat/payment/challenge
   - use test DB or transaction rollback pattern
3. API/action:
   - auth required
   - invalid input
   - forbidden behavior
4. E2E:
   - member join -> post -> comment -> notification
   - admin review challenge submission
   - product checkout -> payment status -> unlock
   - chat realtime 2 sessions
5. Load:
   - k6/Autocannon for shell, discovery, feed, chat send, notification stream, payment status.

Observability:

- Pino structured logs with request id.
- Sentry for unhandled exceptions.
- Metrics:
  - request duration by route
  - DB query duration/sample
  - Redis latency
  - queue lag
  - SSE connection count
  - rate-limit denials
  - payment webhook match/fail count

Acceptance:

- New critical business logic khong goi Prisma truc tiep tu page/action.
- Test suite bat duoc 7 security regressions neu loi quay lai.
- Load-test report co baseline truoc/sau cache/index.

## 5. Lo Trinh Trien Khai De It Rui Ro

### Phase 0 - Baseline va Guardrails

Thoi gian du kien: 0.5-1 ngay.

Viec lam:

- Chay `git status --short`, xac dinh dirty files khong phai cua minh.
- Ghi baseline:
  - route hot path
  - query count
  - response time local/staging
  - current env/deploy topology
- Them load-test scripts neu chua co, nhung chua toi uu voi cam tinh.
- Them docs deploy target neu can.

Output:

- Baseline note trong plan folder.
- Danh sach PR phase ro rang.

### Phase 1 - Security Fixes First

Ly do: scale truoc khi permission dung se bien bug thanh incident.

Viec lam:

- Chat send/channel auth.
- Report resolve by reportId.
- API key revalidate role/status.
- Owner row protection.
- Best answer permission alignment.
- Purchase/challenge target validation.

Verify:

- Tests pass.
- Manual role matrix smoke test OWNER/ADMIN/MOD/MEMBER.

### Phase 2 - Redis Required + Rate Limit Distributed

Viec lam:

- `REQUIRE_REDIS`.
- Redis rate limit.
- Health ready DB + Redis.
- No silent production fallback.

Verify:

- 2 app instances share rate limit.
- Redis missing -> readiness fail.

### Phase 3 - DB Indexes + Counters + Cache

Viec lam:

- Add indexes with migration.
- Add counters/backfill.
- Cache shell/community/discovery.
- Invalidate cache in services.

Verify:

- Query count and P95 improve.
- No stale critical permission/membership view.

### Phase 4 - Realtime SSE

Viec lam:

- Chat message API + stream.
- Notification unread count consistency.
- Redis pub/sub fanout.
- Client reconnect/refetch.

Verify:

- Multi-replica SSE works.
- Permission revoke cuts access.

### Phase 5 - Worker/Cron Split

Viec lam:

- Worker service.
- Queue idempotency.
- Cron jobs moved to queue/API.
- Docker/deploy update.

Verify:

- Worker singleton.
- No duplicate cron side effects.

### Phase 6 - Multi-Instance Deploy

Viec lam:

- Prod compose/deploy split.
- External DB/Redis.
- Immutable GHCR tags.
- Rolling deploy.
- Backup and observability.

Verify:

- 2+ replicas pass smoke/load test.
- DB migration only once.
- Health/alerts behave.

## 6. AI Agent Task Graph

```yaml
project: focus.camp
plan: scaleup-plan-focuscamp
audit_date: 2026-06-07
target: multi-instance production readiness
constraints:
  - do_not_rewrite_app
  - use_existing_nextjs_app_router
  - use_prisma_postgres
  - use_redis_for_distributed_state
  - service_layer_required
  - no_secrets_in_commits
  - preserve_dirty_user_worktree
tracks:
  security:
    priority: P0
    files:
      - lib/community-permissions.ts
      - lib/services/chat.ts
      - app/actions/chat.ts
      - lib/services/payment.ts
      - lib/services/api-keys.ts
      - app/api/mcp/**
      - app/actions/**
    acceptance:
      - service_side_auth_for_chat_report_api_key_payment_challenge
      - owner_row_protected
      - tests_cover_role_demotion_and_wrong_community
  redis_rate_limit_worker:
    priority: P0
    files:
      - lib/redis.ts
      - lib/rate-limit.ts
      - lib/queue.ts
      - instrumentation.ts
      - docker-compose*.yml
    acceptance:
      - redis_required_in_production
      - distributed_rate_limit
      - worker_singleton
  database_cache:
    priority: P1
    files:
      - prisma/schema.prisma
      - lib/services/**
      - app/(shell)/**
      - app/c/[slug]/**
    acceptance:
      - hot_paths_indexed
      - counters_backfilled
      - redis_cache_with_invalidation
  realtime:
    priority: P1
    files:
      - lib/realtime.ts
      - app/api/notifications/stream/route.ts
      - app/api/chat/**
      - components/community/chat/**
    acceptance:
      - sse_chat_and_notifications_work_cross_replica
      - reconnect_refetch_no_message_loss
  infrastructure:
    priority: P1
    files:
      - Dockerfile
      - docker-compose.yml
      - docker-compose.prod.yml
      - .github/workflows/deploy.yml
      - app/api/health/**
    acceptance:
      - app_stateless
      - external_db_redis_ready
      - immutable_image_deploy
  service_cleanup_tests:
    priority: P2
    files:
      - lib/services/**
      - app/actions/**
      - app/api/**
      - tests/**
    acceptance:
      - no_new_direct_prisma_business_logic
      - service_integration_tests_for_core_flows
      - load_test_baseline_documented
```

## 7. Definition Of Done

Mot phase duoc coi la xong khi:

- Co code change nho, co pham vi ro.
- Co migration/backfill neu doi schema.
- Co test cho behavior rui ro.
- Co manual verify command/result.
- Co rollback note neu deploy production.
- Khong sua lan sang docs/app areas khong lien quan.

Toan bo plan duoc coi la xong khi:

- App chay duoc 2+ replicas voi shared DB/Redis.
- Redis la bat buoc trong production.
- Worker/cron khong duplicate.
- Hot routes co cache/index/counter.
- Chat/notification realtime hoat dong qua Redis pub/sub.
- 7 security risks trong report da duoc fix/test.
- Deploy co health/readiness va observability co the bat loi som.

## 8. Thu Tu PR De Xuat

1. `security-service-hardening`
   - Fix chat/report/api-key/member-role/best-answer/purchase/challenge validation.
   - Tests for permission bypass.
2. `redis-required-rate-limit`
   - Redis production guard.
   - Distributed rate limiter.
   - Health readiness update.
3. `db-index-counter-migration`
   - Prisma indexes.
   - Counter fields/backfill.
   - Counter dual-write.
4. `shell-discovery-cache`
   - Redis cache shell/discovery/community summary.
   - Invalidation hooks.
5. `realtime-sse-chat-notifications`
   - Chat API/stream.
   - Notification count event consistency.
6. `worker-cron-split`
   - Worker process/service.
   - Queue idempotency.
   - Cron conversion.
7. `prod-multi-instance-deploy`
   - Compose/deploy split.
   - External DB/Redis.
   - GHCR SHA deploy and rolling update.
8. `service-layer-cleanup-and-load-tests`
   - Move remaining direct Prisma business logic.
   - Add k6/autocannon baseline.

## 9. Quick Commands Cho Agent Sau

Read-only audit:

```powershell
git status --short
rg "prisma\\." app lib components -g "*.ts" -g "*.tsx"
rg "rateLimit|checkRateLimit|Redis|BullMQ|Queue" lib app -g "*.ts" -g "*.tsx"
rg "community-permissions|hasCommunityPermission|can" lib app components -g "*.ts" -g "*.tsx"
rg "revalidatePath|revalidateTag" app lib -g "*.ts" -g "*.tsx"
```

Verification after implementation:

```powershell
npm run lint
npm run test
npx prisma validate
npx prisma migrate status
docker compose config
```

Neu repo chua co script test/lint hoac command fail vi env thieu, agent phai ghi ro ly do va verify thay the bang command co san.

## 10. Source Evidence Map

High-level report:

- `report.html`

Infra:

- `Dockerfile`
- `docker-compose.yml`
- `.github/workflows/deploy.yml`
- `app/api/health/route.ts`
- `instrumentation.ts`
- `scripts/backup-db.sh`
- `scripts/init-prisma-migrations.sh`

Redis/queue/realtime:

- `lib/redis.ts`
- `lib/rate-limit.ts`
- `lib/queue.ts`
- `lib/realtime.ts`
- `app/api/notifications/stream/route.ts`
- `components/shell/notif-badge.tsx`

Chat:

- `app/actions/chat.ts`
- `lib/services/chat.ts`
- `app/c/[slug]/chat/`
- `components/community/chat/`

Permissions/security:

- `lib/community-permissions.ts`
- `docs/roles-permissions.md`
- `app/actions/`
- `app/api/mcp/`
- `lib/services/api-keys.ts`
- `lib/services/payment.ts`

Data/service:

- `prisma/schema.prisma`
- `lib/services/`
- `app/c/[slug]/`
- `app/(shell)/`

## 11. Notes Cho Nguoi Trien Khai

- Dung factual behavior trong code hien tai lam source of truth, khong dua vao roadmap cu neu mau thuan.
- Moi permission fix phai nam service-side; UI hide button chi la UX.
- Moi cache phai co invalidation ro, neu chua ro thi dung index/counter truoc.
- Moi queue job lien quan payment/notification/AI phai idempotent.
- Khi sua Next.js behavior, doc local `node_modules/next/dist/docs/` truoc vi repo dung Next 16.
- Khong echo `.env`, token, VPS password, API key trong report/log/commit.
