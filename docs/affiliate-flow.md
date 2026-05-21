# Affiliate Flow

## Tổng quan

Mỗi member có thể tạo link giới thiệu riêng cho từng community. Khi người được giới thiệu mua sản phẩm thành công, member nhận hoa hồng theo % do owner cấu hình.

---

## Các bước trong flow

### 1. Tạo link (`getOrCreateAffiliateLink`)
- Member vào dashboard → system tạo `AffiliateLink` với code 8 ký tự random
- Idempotent: mỗi user chỉ có 1 link per community
- Code dùng alphabet an toàn (không có ký tự dễ nhầm: 0/O, 1/l/I)

### 2. Click tracking (`GET /api/affiliate/track?ref=<code>&to=<path>`)
- Validate format code + destination (chống open redirect)
- Tăng `AffiliateLink.clicks` (best-effort, không block redirect)
- Set cookie `fc_ref=<code>` với `maxAge` lấy từ `affiliateConfig.cookieDays` (default 30 ngày)
- Redirect đến `to`

### 3. Attribution khi signup (`attributeReferralOnSignup`)
- Khi user đăng ký mới, nếu có cookie `fc_ref` → tạo `Referral` row
- Chặn self-referral trực tiếp (`link.userId === referredUserId`)
- Fraud detection: canonicalize email (strip `+tag`, bỏ dots với Gmail) → nếu trùng → status `SUSPICIOUS`
- Bình thường → status `PENDING`

### 4. Convert khi mua hàng (`convertReferralFromPurchase`)
- Khi payment COMPLETED → tìm `Referral` PENDING của buyer
- Chỉ convert nếu community đó `affiliateConfig.enabled = true`
- Tính commission: `floor(amountVnd × commissionPercent / 100)`
- Update status → `CONVERTED`, lưu `commissionVnd` + `convertedAt`
- **SUSPICIOUS bị skip** — owner phải approve thủ công trước

### 5. Payout (`markReferralPayout`)
- Owner/Admin vào dashboard → mark referral `PAID` hoặc `REJECTED`
- Chỉ áp dụng cho referral đã `CONVERTED`
- Cần permission `manage_settings`

### 6. Approve suspicious (`approveSuspiciousReferral`)
- Owner approve → set status về `PENDING`
- Sẽ convert ở lần mua tiếp theo của user đó

---

## Trạng thái Referral

```
PENDING → CONVERTED → PAID
                    → REJECTED

SUSPICIOUS (chờ owner approve thủ công → PENDING)
```

---

## Cấu hình affiliate per-community (`affiliateConfig`)

Lưu trong `Community.affiliateConfig` (JSON):

| Field               | Default | Mô tả                        |
|---------------------|---------|------------------------------|
| `enabled`           | `false` | Bật/tắt affiliate cho community |
| `commissionPercent` | `10`    | % hoa hồng trên giá trị đơn hàng |
| `cookieDays`        | `30`    | Thời gian cookie attribution |

---

## Key files

| File | Vai trò |
|------|---------|
| `lib/services/affiliate.ts` | Toàn bộ business logic |
| `app/api/affiliate/track/route.ts` | Click tracking + set cookie |
| `app/actions/affiliate.ts` | Server actions cho UI |
| `app/c/[slug]/affiliate/page.tsx` | Dashboard owner/admin |
| `app/(shell)/u/[handle]/affiliates/page.tsx` | Dashboard member |
| `prisma/schema.prisma` | Models: AffiliateLink, Referral |
