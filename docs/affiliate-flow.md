# Affiliate Flow

## Tong quan

Moi member co the tao link gioi thieu rieng cho tung community. Khi nguoi duoc gioi thieu mua product, cart item, bump product, hoac paid challenge thanh cong, member nhan hoa hong theo % do owner cau hinh.

---

## Cac buoc trong flow

### 1. Tao link (`getOrCreateAffiliateLink`)
- Member vao dashboard -> system tao `AffiliateLink` voi code 8 ky tu random
- Idempotent: moi user chi co 1 link per community
- Code dung alphabet an toan, tranh ky tu de nham nhu 0/O, 1/l/I

### 2. Click tracking (`GET /api/affiliate/track?ref=<code>&to=<path>`)
- Validate format code + destination, chong open redirect
- Tang `AffiliateLink.clicks` best-effort
- Set cookie `fc_ref=<code>` voi `maxAge` lay tu `affiliateConfig.cookieDays` (default 30 ngay)
- Redirect den `to`

### 3. Attribution khi signup (`attributeReferralOnSignup`)
- Khi user dang ky moi, neu co cookie `fc_ref` -> tao `Referral` row
- Chan self-referral truc tiep (`link.userId === referredUserId`)
- Fraud detection: canonicalize email (strip `+tag`, bo dots voi Gmail) -> neu trung -> status `SUSPICIOUS`
- Binh thuong -> status `PENDING`

### 4. Commission ledger (`convertReferralFromPurchase`, `convertReferralFromChallengePayment`)
- Khi product/cart/bump/challenge payment `COMPLETED` -> tim attribution `Referral` cua buyer trong community do
- Skip `SUSPICIOUS`; owner phai approve thu cong truoc
- Chi tao commission neu community do `affiliateConfig.enabled = true`
- Moi order item tao 1 dong `AffiliateCommission`
- Product/cart/bump: source = purchase id, amount = gia tri item thuc thu
- Challenge: source = payment id, amount = entry fee thuc thu
- Tinh commission: `floor(amountVnd * commissionPercent / 100)`
- Referral status duoc set `CONVERTED` o commission dau tien; cac commission sau van duoc ghi vao ledger

### 5. Payout (`markAffiliateCommissionPayout`)
- Owner/Admin vao dashboard -> mark tung commission row `PAID` hoac `REJECTED`
- Can permission `manage_settings`

### 6. Approve suspicious (`approveSuspiciousReferral`)
- Owner approve -> set status ve `PENDING`
- Commission se duoc tao o lan mua tiep theo cua user do

---

## Trang thai

```
Referral: PENDING -> CONVERTED

AffiliateCommission: UNPAID -> PAID
                          -> REJECTED

SUSPICIOUS (cho owner approve thu cong -> PENDING)
```

---

## Cau hinh affiliate per-community (`affiliateConfig`)

Luu trong `Community.affiliateConfig` (JSON):

| Field               | Default | Mo ta |
|---------------------|---------|-------|
| `enabled`           | `false` | Bat/tat affiliate cho community |
| `commissionPercent` | `10`    | % hoa hong tren gia tri order item |
| `cookieDays`        | `30`    | Thoi gian cookie attribution |

---

## Key files

| File | Vai tro |
|------|---------|
| `lib/services/affiliate.ts` | Toan bo business logic |
| `app/api/affiliate/track/route.ts` | Click tracking + set cookie |
| `app/actions/affiliate.ts` | Server actions cho UI |
| `app/c/[slug]/affiliate/page.tsx` | Dashboard owner/admin |
| `app/(shell)/u/[handle]/affiliates/page.tsx` | Dashboard member |
| `prisma/schema.prisma` | Models: AffiliateLink, Referral, AffiliateCommission |
