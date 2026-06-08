# Module: Challenges / Expeditions

## Tổng quan
Hệ thống thử thách nhóm có quản lý task theo ngày, check-in, review submission, freeze time, voting cộng đồng.

---

## Database Schema

### `expeditions`
| Field | Type | Note |
|---|---|---|
| id | bigint PK | |
| title | string | |
| slug | string unique | route key |
| description | text | |
| boss_name | string nullable | tên "boss" thử thách |
| difficulty | enum | normal / hard / chaos |
| required_days | int default 21 | số ngày thử thách |
| max_members | int default 999 | |
| created_by | FK users | người tạo |
| leader_id | FK users | người dẫn dắt |
| status | string | open → active → completed / failed / cancelled |
| deposit_aip | int nullable | đặt cọc AIP |
| price | decimal(15,2) | giá tham gia |
| starts_at | datetime | |
| ends_at | datetime | |
| freeze_from_day | int nullable | ngày bắt đầu freeze |
| freeze_starts_at | datetime nullable | |
| freeze_ends_at | datetime nullable | |
| brand_id | FK | multi-brand |
| timestamps | | |

### `expedition_members`
| Field | Type | Note |
|---|---|---|
| id | bigint PK | |
| expedition_id | FK expeditions | |
| user_id | FK users | unique(expedition_id, user_id) |
| class_at_join | string | class lúc tham gia |
| status | string default 'approved' | pending / approved / paid / rejected |
| joined_at | datetime | |
| approved_at | datetime | |
| approved_by | FK users | |
| personal_starts_at | datetime nullable | user tự bấm "Start" — timer cá nhân |
| completed_at | datetime | |
| kicked_at | datetime | |
| last_checkin_at | datetime | |
| consecutive_missed_days | int | |
| miss_warned | boolean | |
| revenue_share_pct | decimal | |
| payment_amount | decimal(15,2) | |
| payment_ref | string | |
| video_feedback_url | string nullable | |
| video_feedback_status | string nullable | pending / approved / rejected |
| video_feedback_note | string nullable | |
| video_feedback_at | datetime nullable | |

### `expedition_checkins`
| Field | Type | Note |
|---|---|---|
| id | bigint PK | |
| expedition_id | FK | |
| user_id | FK | |
| content | text | nội dung check-in (5-1000 chars) |
| brand_id | FK | |
| timestamps | | max 1/ngày/user |

### `challenge_tasks`
| Field | Type | Note |
|---|---|---|
| id | bigint PK | |
| expedition_id | FK | unique(expedition_id, day_number) |
| day_number | int | ngày thứ mấy |
| label | string nullable | tên hiển thị (vd: "Kick-off") |
| title | string required | |
| description | text nullable | |
| sop_content | text nullable | hướng dẫn SOP |
| video_url | string nullable | |
| meeting_at | datetime nullable | giờ họp |
| evidence_type | string default 'text' | text / link / image / text+image |
| evidence_label | text nullable | yêu cầu bằng chứng |
| admin_note | text nullable | ghi chú hiện sau khi duyệt |
| timestamps | | |

### `challenge_task_completions`
| Field | Type | Note |
|---|---|---|
| id | bigint PK | |
| challenge_task_id | FK | unique(challenge_task_id, user_id) |
| user_id | FK | |
| evidence | text nullable | |
| is_late | boolean default false | tự tính |
| status | string default 'pending' | pending / approved / rejected |
| reject_count | tinyint default 0 | max 2 lần reject |
| resubmit_payment_ref | string nullable | thanh toán khi resubmit lần 2+ |
| reviewed_by | FK users nullable | |
| reviewed_at | datetime nullable | |
| review_note | string nullable | lý do reject |
| timestamps | | |

### `submission_votes`
| Field | Type | Note |
|---|---|---|
| id | bigint PK | |
| completion_id | FK | unique(completion_id, user_id) |
| user_id | FK | |
| timestamps | | toggle vote |

### `community_challenges`
| Field | Type | Note |
|---|---|---|
| id | bigint PK | |
| title | string | |
| description | text | |
| target_type | string | loại mục tiêu |
| target_value | int | |
| current_value | int | |
| reward_xp | int | |
| reward_aip | int | |
| week_start | date | |
| week_end | date | |
| completed_at | datetime nullable | |
| brand_id | FK | |

---

## Business Logic Flow

### Lifecycle
```
Admin tạo (open) → User xin vào (pending) → Admin duyệt (approved)
→ User bấm Start (personal_starts_at = now) → Task 1 mở ngay, các task sau mở theo mốc 07:00 VN
→ User nộp evidence → Admin approve/reject → Hoàn thành / Thất bại
```

### Enrollment
1. User bấm "Tham gia" → tạo ExpeditionMember status=pending
2. Admin approve → status=approved, approved_at/by ghi nhận
3. User bấm "Bắt đầu" → personal_starts_at = now() (timer CÁ NHÂN, không phải timer expedition)
4. Có thể reject → user xin lại được

### Mở khoá Task theo ngày
- Mốc ngày challenge cố định là `07:00 Asia/Ho_Chi_Minh`, không phụ thuộc timezone server/container.
- User bấm "Bắt đầu" lúc nào cũng được; Task 1 mở ngay như warm-up.
- Với mode `DAILY` / `DAILY_SEQUENTIAL`, nút "Bắt đầu" chỉ mở từ 07:00 đến 23:59 VN. Từ 00:00 đến trước 07:00, UI disable và service vẫn chặn nếu submit trực tiếp.
- `personal_starts_at` được round up tới mốc 07:00 VN kế tiếp để tính ngày chính thức. Nếu bấm đúng 07:00 thì dùng mốc đó.
- Task ngày N unlock/deadline tại `day_anchor + (N - 1) × 24h` / `day_anchor + N × 24h`.
- `DAILY_SEQUENTIAL`: ngoài time gate, task sau chỉ mở khi task trước đã có submission không bị reject.
- Freeze period → currentDay bị cap tại `freeze_from_day - 1`, elapsed hours trừ thời gian freeze

### Task Submission
- User nộp evidence (text hoặc screenshot) → status=pending
- `is_late = true` nếu nộp sau `day_number × 24h`
- Admin approve → thông báo user, award XP
- Admin reject + note → user resubmit được (tối đa 2 lần reject)
- Lần reject thứ 2+ yêu cầu payment (34000 VND)

### Check-in hàng ngày
- Tối đa 1 lần/ngày/user
- Content 5-1000 ký tự
- Award 5 XP × streak multiplier

### Video Feedback (optional)
- User nộp video URL sau khi hoàn thành tasks
- Admin approve → reward ($500 training)
- Admin reject + note → cho resubmit

### Freeze Mechanics
- Config: freeze_from_day, freeze_starts_at, freeze_ends_at
- Khi freeze active: day progress đóng băng tại freeze_from_day - 1
- Elapsed hours trừ khoảng thời gian freeze
- Task deadline dời theo

### XP & Bonus
- Check-in: 5 XP
- Task complete: 5 XP
- Streak multiplier: 7d=1.1x, 30d=1.2x, 90d=1.5x
- Class diversity bonus: 3+ class khác nhau = 1.2x, 5+ = 1.5x

### Voting
- Cộng đồng vote submission (toggle)
- Hiển thị vote count trong submission history

---

## Livewire Components

### `ChallengePage` — Danh sách expeditions
- Hiện expeditions status IN [active, open]
- Load leader, paginate 12/trang

### `ChallengeDetail` — Trang chi tiết (766 dòng code)

**Chức năng user:**
- `requestJoin()`, `cancelRequest()`, `startMyChallenge()`
- `checkin()` — check-in hàng ngày
- `completeTask($taskId)` — nộp evidence
- `resubmitTask($taskId)` — nộp lại khi bị reject
- `submitVideoFeedback()`
- `toggleVote($completionId)`

**Chức năng admin:**
- `approveRequest/rejectRequest($memberId)`
- `approveSubmission/rejectSubmission($completionId)`
- `approveAllPending()` — bulk approve
- `approveVideoFeedback/rejectVideoFeedback($memberId)`
- `startEditTask/saveEditTask/cancelEditTask` — sửa task inline

**View sections:**
1. Header — title, status, difficulty, dates, member count
2. Join/Enrollment — nút tham gia, panel admin duyệt
3. Member list — avatar approved members
4. Personal progress — ngày hiện tại, check-in form
5. Daily tasks — accordion, unlock theo ngày, evidence form, SOP, video
6. Pending requests — admin approve/reject
7. Video feedback — nộp + admin review
8. Submission history — paginate 10/trang, search, vote, approve/reject
9. Member report — bảng thống kê on_track/behind/completed/miss

### `AdminChallenges` — Admin CRUD
- CRUD expedition (title, slug, difficulty, leader, days, members, price, dates)
- CRUD tasks (day_number, title, desc, SOP, video, evidence_type, label)
- Toggle manage tasks per expedition

### `SidebarChallenge` — Widget community challenge
### `SidebarChallenges` — Widget 3 open expeditions

---

## Routes
```
GET  /challenge              → ChallengePage
GET  /challenge/{slug}       → ChallengeDetail
GET  /admin/challenges       → AdminChallenges (admin gate)
GET  /api/bot/challenge-progress → BotApiController
```

---

## Integrations
- **XpService** — award XP khi checkin, complete task
- **TelegramService** — notify admin chat khi có submission mới
- **GenericNotification** — thông báo user khi approve/reject
- **BotApiController** — API cho bot lấy challenge progress

---

## Key Files
```
app/Models/Expedition.php
app/Models/ExpeditionMember.php
app/Models/ExpeditionCheckin.php
app/Models/ChallengeTask.php
app/Models/CommunityChallenge.php
app/Livewire/ChallengePage.php
app/Livewire/ChallengeDetail.php
app/Livewire/AdminChallenges.php
app/Livewire/SidebarChallenge.php
app/Livewire/SidebarChallenges.php
resources/views/livewire/challenge-page.blade.php
resources/views/livewire/challenge-detail.blade.php
resources/views/livewire/admin-challenges.blade.php
```
