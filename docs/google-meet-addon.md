# Google Meet Add-on — Setup Guide

focus.camp sidebar trong Google Meet để điểm danh, giao bài và check-in cuối buổi.

---

## Kiến trúc

```
Google Meet sidebar (Apps Script)
  └── POST /api/meet/addon  { action, meetingCode, ... }
       X-Google-Identity-Token: <ScriptApp.getIdentityToken()>
focus.camp backend
  ├── Verify JWT → email → User
  ├── meetingCode → Event (meetingUrl / meetSpaceName LIKE)
  ├── attend    → EventBooking ATTENDED + XP
  ├── task      → Redis meet:session:{eventId} (TTL 8h)
  └── submit    → awardXp CHECKIN
```

---

## Bước 1 — Tạo GCP Project & Apps Script

1. Vào [console.cloud.google.com](https://console.cloud.google.com) → New Project.
2. Enable APIs:
   - **Google Meet API** (Meet Add-ons)
   - **Apps Script API**
3. **OAuth consent screen** → External (personal Gmail không dùng được Internal)
   - App name: `focus.camp`
   - Scopes: `.../auth/meetings.space.readonly`, `.../auth/script.external_request`, `.../auth/userinfo.email`
   - Test users: thêm email của bạn + mọi người cần test (tối đa 100 users)
4. **Credentials** → OAuth 2.0 Client ID → Web application
   - Copy Client ID → dán vào VPS `.env` thành `MEET_ADDON_OAUTH_CLIENT_ID=...`

## Bước 2 — Tạo Apps Script Project

1. Vào [script.google.com](https://script.google.com) → New Project.
2. Project Settings → Associate with GCP project (nhập Project Number).
3. Xóa nội dung `Code.gs` mặc định.
4. Copy nội dung từ `addon/Code.gs` vào `Code.gs`.
5. Thêm file mới → đặt tên `Cards` → copy nội dung từ `addon/Cards.gs`.
6. Copy nội dung `addon/appsscript.json` → dán vào Project Settings → `appsscript.json`.

> **Logo**: thay `https://focus.camp/icon-192.png` trong `appsscript.json` bằng URL icon thật nếu cần.

## Bước 3 — Deploy Add-on

1. Deploy → **New deployment** → Type: **Add-on**.
2. Description: `focus.camp v1`.
3. Execute as: **User accessing the web app**.
4. Who has access: **Anyone** (GCP consent screen đã giới hạn test users).
5. Deploy → copy **Deployment ID**.

## Bước 4 — Cài Add-on trong Google Meet

### Cách 1: Cài via Apps Script (cho bản thân)
- Script project → Deploy → Test Deployments → Install for testing.

### Cách 2: Publish qua Admin Console (Workspace)
- Google Admin Console → Apps → Google Workspace Marketplace apps → Upload Private App → nhập Deployment ID.

## Bước 5 — Biến môi trường VPS

Thêm vào `/opt/focus-camp/.env`:

```bash
MEET_ADDON_OAUTH_CLIENT_ID=<GCP OAuth Client ID>
```

Restart container:

```bash
docker compose up -d --build
```

---

## Test & Verify

### Test backend với curl (dev):

```bash
# Expect 401 (no token)
curl -X POST https://focus.camp/api/meet/addon \
  -H "Content-Type: application/json" \
  -d '{"action":"context","meetingCode":"abc-defg-hij"}'

# Dev bypass (NODE_ENV=development only):
curl -X POST http://localhost:3000/api/meet/addon \
  -H "Content-Type: application/json" \
  -H "X-Dev-Email: your@email.com" \
  -d '{"action":"context","meetingCode":"abc-defg-hij"}'
```

### Test end-to-end:
1. Tạo event trên focus.camp → copy meeting URL.
2. Join Google Meet từ URL đó.
3. Meet sidebar → focus.camp Add-on → mở.
4. Bấm **Điểm danh** → check DB: `EventBooking.status = ATTENDED`.
5. Host bấm **Tạo Task** → Member bấm Refresh → thấy task → Submit → check XP ledger.

---

## Redis session key format

```
meet:session:{eventId}
TTL: 8 giờ
Value: { mode, content, type, activatedAt }
```

Nếu Redis unavailable → in-memory Map (single-pod VPS OK).
