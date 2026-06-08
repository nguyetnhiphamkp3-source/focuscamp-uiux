# Plan — Xuất hóa đơn tự động qua Webhook (per-community, generic)

> Created 2026-06-04. Status: PENDING APPROVAL. Branch: main.
> (Slug thư mục có chữ "gettime" là lịch sử — thiết kế đã chuyển sang **webhook chung**, gettime chỉ là 1 ví dụ người nhận.)

## Context

focus.camp là nền tảng **đa community**, thu tiền qua SePay (VietQR) cho 6 loại đơn: `product, challenge, cart, event, subscription, community`. Mỗi community là một business riêng → khi muốn xuất hóa đơn (HĐ), họ trỏ về **hệ thống HĐ của chính họ** (MISA, VNPT, Viettel eInvoice, middleware riêng, hoặc — như community của owner focus.camp — về gettime.work).

⇒ Tính năng làm theo dạng **webhook chung**: focus.camp gửi 1 **payload chuẩn** (các field HĐ VN) tới **endpoint + header auth** mà mỗi community tự khai. Bên nhận tự lo việc phát hành HĐ. focus.camp KHÔNG hardcode nhà cung cấp nào.

**Vấn đề dữ liệu:** focus.camp chỉ lưu `user.email` (+ `user.name` optional). KHÔNG có MST/CCCD/địa chỉ/SĐT/loại người mua — toàn bộ field bắt buộc cho HĐ.

**Mục tiêu:** community nào BẬT → người mua nhập thông tin HĐ **trước khi QR hiện ra**; khi payment khớp `COMPLETED` (đơn > 0đ) → bắn payload chuẩn ra endpoint của community. Community không bật → giữ nguyên flow cũ. Khi admin duyệt thanh toán thủ công, UI phải hỏi admin có gửi webhook xuất HĐ cho đơn đó không.

## Quyết định đã chốt với owner

- Thu thông tin HĐ **BẮT BUỘC**, **trước khi QR xuất hiện**.
- **Chỉ** community đã BẬT (có khai endpoint + key) mới áp dụng. Chưa bật → flow cũ.
- Trigger cho **tất cả** đơn có thu tiền **> 0đ** (6 refType).
- **Webhook chung**: community tự khai `endpoint` + `authHeaderName` + `authHeaderValue`. Payload là 1 contract chuẩn focus.camp (không per-provider mapping, không adapter riêng). Gettime/MISA/... chỉ là bên nhận.
- **V1 chỉ 1 webhook invoice / community**: mỗi community có đúng 1 cấu hình `invoiceConfig` dùng cho toàn bộ đơn của community đó. Chưa làm nhiều endpoint/provider song song.
- **Bật invoice bắt buộc test webhook thành công**: nếu `enabled=true` thì endpoint/key/VAT/paymentMethod/unit phải đủ và server phải test POST được endpoint. Không cho kích hoạt invoice bằng config thiếu hoặc endpoint lỗi.
- Người cấu hình: **OWNER + ADMIN** community (quyền `manage_billing` — [community-permissions.ts:52](lib/community-permissions.ts#L52) đã gồm ADMIN; MOD/MEMBER không). Platform super-admin tính sau.
- **Đơn 0đ (coupon 100% / free): KHÔNG xuất HĐ** (xem mục "Coupon & đơn 0đ").
- **Manual approval:** khi admin bấm duyệt tay cho đơn >0đ của community đang bật invoice, confirm phải có lựa chọn `Duyệt + gửi hóa đơn` hoặc `Chỉ duyệt, không gửi hóa đơn`.
- **Bảo mật endpoint webhook:** chỉ cho URL public HTTPS; chặn localhost/private IP/internal metadata host.

## Kiến trúc — 1 cổng chặn duy nhất

Cả 6 flow sau khi tạo `Payment` PENDING (đơn **> 0đ**) đều redirect về **`app/pay/[paymentCode]/page.tsx`**, QR build đúng 1 chỗ qua `buildVietQRUrl()` ([lib/sepay.ts](lib/sepay.ts)). ⇒ Chèn form nhập HĐ trước QR ở trang này là chặn cả 6 flow (KISS/DRY).

```
[Mua/Tham gia/...] (>0đ) → tạo Payment PENDING → /pay/[code]
   community BẬT invoicing & chưa có metadata.invoice & status=PENDING?
        ├─ CÓ  → render <InvoiceForm> (CHẶN QR) → submit → lưu metadata.invoice → refresh
        └─ KHÔNG → render QR (như cũ)
   ... SePay webhook khớp → matchSePay → COMPLETED → issueInvoiceForPayment()
        → POST payload chuẩn tới community.endpoint (header auth của community)
   ... Admin duyệt tay → hỏi có gửi HĐ không
        ├─ CÓ  → complete payment → issueInvoiceForPayment()
        └─ KHÔNG → complete payment, lưu invoiceWebhook.skippedManual=true
```

## Payload contract (focus.camp gửi đi — cố định, có tài liệu)

```jsonc
{
  "external_ref": "<paymentCode>",        // unique chống trùng
  "buyer_type": 1,                         // 1 cá nhân | 2 công ty
  "buyer_name": "...", "buyer_legal_name": "...",
  "buyer_tax_code": "...", "buyer_national_id": "...",
  "buyer_address": "...", "buyer_email": "...", "buyer_phone": "...",
  "vat_rate": 10,                          // từ config community
  "payment_method": "CK",                  // từ config community
  "items": [{ "name": "...", "unit": "lần", "quantity": 1, "unit_price_vnd": 100000 }]
}
```
Bên nhận (gettime / middleware community khác) phải chấp nhận shape này. focus.camp KHÔNG biến đổi theo từng provider.

Header gửi kèm:
- `{ [cfg.authHeaderName]: <decrypted authHeaderValue> }`
- `Content-Type: application/json`
- `Accept: application/json`
- `Idempotency-Key: <paymentCode>` để bên nhận chống tạo trùng hóa đơn nếu cùng một đơn bị gửi lại.

## Coupon & đơn 0đ (đã verify code-trace)

Đơn **0đ** (coupon 100% / free) đi đường riêng: Payment sinh ra **đã `COMPLETED`** ngay trong txn ([payment.ts:139-190](lib/services/payment.ts#L139), [payment.ts:281-311](lib/services/payment.ts#L281), [cart.ts:129-149](app/actions/cart.ts#L129)), **không** qua `/pay`, **không** chạy `matchSePay...` (early-return khi status ≠ PENDING — [payment.ts:412](lib/services/payment.ts#L412)). ⇒ Theo quyết định "không xuất HĐ cho 0đ", đường free **tự nhiên bị loại** — không cần code thêm. Chỉ thêm guard: `issueInvoiceForPayment` early-return nếu `amountVnd <= 0`. (Coupon giảm **một phần** → đơn >0đ → qua /pay + xuất HĐ bình thường, gửi số tiền **thực trả**.)

## Lưu trữ dữ liệu

1. **Config (per-community, 1 webhook duy nhất):** cột JSON mới `invoiceConfig Json?` trên `Community` (đồng bộ pattern `pillarsConfig`/`gemsConfig`/`billingModel`/`uiConfig`). KHÔNG nhét vào `billingModel` (tránh `updatePaymentConfigAction` ghi đè — [payment-config.ts:56](app/actions/payment-config.ts#L56)).
   - ⚠️ **PHẢI tạo migration Prisma** (`prisma migrate dev --name add_invoice_config`) — memory: schema không migration → ship vỡ prod.
   - Shape: `{ enabled, endpoint, authHeaderName, authHeaderValue(mã hóa), vatRate, paymentMethod, unit, createdByUserId?, createdAt?, updatedByUserId?, updatedAt?, lastTestAt?, lastTestOk?, lastTestedByUserId? }`. `authHeaderValue` mã hóa AES-256-GCM qua `encryptSecret()` ([lib/integrations/encryption.ts](lib/integrations/encryption.ts)).
   - `enabled=false`: cho lưu config nháp, endpoint/key có thể trống.
   - `enabled=true`: bắt buộc endpoint/key hợp lệ + test webhook thành công ở server action trước khi save/kích hoạt.
   - Audit label: `createdByUserId/createdAt` set lần đầu tạo config, không ghi đè khi sửa; `updatedByUserId/updatedAt` update mỗi lần save; `lastTestedByUserId/lastTestAt/lastTestOk` update mỗi lần test.
2. **Thông tin người mua (per-payment):** `payment.metadata.invoice` (Json sẵn có) — không migration. Update spread giữ metadata cũ.
3. **Trạng thái gửi webhook (per-payment):** `payment.metadata.invoiceWebhook` để admin/debug biết HĐ đã gửi hay lỗi:
   - Thành công: `{ status:"sent", attemptedAt, statusCode }`
   - Lỗi: `{ status:"failed", attemptedAt, statusCode?, error }`
   - Bỏ qua khi duyệt tay: `{ status:"skipped", skippedBy, skippedAt, reason:"manual_approval" }`

## Các bước triển khai

### Bước 1 — Schema + validators
- `prisma/schema.prisma`: `+ invoiceConfig Json?` vào `Community`; `prisma migrate dev --name add_invoice_config` → commit migration.
- `lib/community-config.ts` (pattern `getPaymentConfig`): `InvoiceConfigSchema` `{ enabled:boolean, endpoint?:string, authHeaderName:string.min(1).max(60).default("X-Api-Key"), authHeaderValue?:string, vatRate:enum(-2,-1,0,5,8,10), paymentMethod:enum("TM","CK","TM/CK","KHAC").default("CK"), unit:string.max(30).default("lần"), createdByUserId?, createdAt?, updatedByUserId?, updatedAt?, lastTestAt?, lastTestOk?, lastTestedByUserId? }` + `.superRefine`: `enabled=true` ⇒ endpoint + authHeaderValue bắt buộc. `getInvoiceConfig(c)` chỉ trả config usable nếu schema hợp lệ; `enabled=false` thì checkout bỏ qua.
- `lib/webhook-url.ts` hoặc helper trong `lib/validations.ts`: `assertSafeWebhookUrl(url)` — URL phải là `https://`, hostname không phải `localhost`, không phải private IP (`127.0.0.1`, `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, link-local), không phải metadata/internal host.
- `lib/validations.ts`: `InvoiceBuyerSchema` `{ buyer_type:1|2, buyer_name(req), buyer_email(req,email), buyer_legal_name?, buyer_tax_code?, buyer_national_id?, buyer_address?, buyer_phone? }` + `.refine`: type=2 ⇒ bắt buộc `buyer_tax_code`+`buyer_legal_name`; type=1 ⇒ **bắt buộc** `buyer_national_id` (CCCD).

### Bước 2 — Settings UI (OWNER + ADMIN)
- `app/actions/payment-config.ts`:
  - `testInvoiceWebhookAction({communityId, endpoint, authHeaderName, authHeaderValue, vatRate, paymentMethod, unit})` — auth + `manage_billing`, validate safe URL, gửi payload test tới endpoint, timeout 8s, trả ok/error cho UI; nếu lưu vào config thì update `lastTestedByUserId/lastTestAt/lastTestOk`.
  - `updateInvoiceConfigAction({communityId, communitySlug, enabled, endpoint, authHeaderName, authHeaderValue, vatRate, paymentMethod, unit})` — auth + `manage_billing`, validate `InvoiceConfigSchema`, `encryptSecret(authHeaderValue)` (để trống khi sửa → giữ giá trị cũ). Nếu `enabled=true`, server action phải validate safe URL và gửi test POST thành công **ngay lúc save** rồi mới lưu `enabled:true`; set `createdByUserId/createdAt` nếu chưa có; luôn update `updatedByUserId/updatedAt`; lưu `lastTestAt/lastTestOk`; `revalidatePath`.
- `app/c/[slug]/settings/page.tsx`: thêm section **"Xuất hóa đơn (webhook)"** cạnh bank config: toggle bật, Endpoint URL, Header name (default `X-Api-Key`), Header value (password, mã hóa), select vatRate (default 10), paymentMethod (CK), unit ("lần"), nút **Test webhook**. Render khi có quyền `manage_billing` (OWNER/ADMIN). Nếu bật mà test/save test fail → không kích hoạt. Hiển thị label audit: **"Tạo bởi {user.name/email} lúc {createdAt}"**, **"Cập nhật gần nhất bởi {user.name/email} lúc {updatedAt}"**, **"Test gần nhất bởi {user.name/email} lúc {lastTestAt}: thành công/thất bại"**.

### Bước 3 — Cổng chặn QR + lưu info
- `app/pay/[paymentCode]/page.tsx`: mở rộng `select` community lấy `invoiceConfig`; `const inv = getInvoiceConfig(community)`. Nhánh `PENDING`: nếu `inv?.enabled && !meta.invoice` ⇒ render `<InvoiceForm>` & bỏ qua QR; ngược lại QR như cũ.
- `components/checkout/invoice-form.tsx` (client, mới): radio Cá nhân(1)/Công ty(2) → field tương ứng + name/address/phone/email(prefill). Submit → server action → `router.refresh()`. Tham khảo [components/marketplace/buy-with-coupon.tsx](components/marketplace/buy-with-coupon.tsx).
- `app/actions/invoice.ts` (mới): `saveInvoiceBuyerInfoAction({paymentCode, ...fields})` — auth `session.user.id === payment.userId`, payment `PENDING`, validate `InvoiceBuyerSchema`, update `metadata = {...old, invoice: parsed}`.
- Nhánh `COMPLETED`: nếu community bật invoice và `metadata.invoice.buyer_email` tồn tại, hiển thị dòng **"Hóa đơn sẽ được gửi vào {buyer_email}."**

### Bước 4 — Outbound webhook (generic, mọi refType, chỉ > 0đ)
- `lib/integrations/invoice-webhook.ts` (mới, mô phỏng [lib/integrations/gettime-crm.ts](lib/integrations/gettime-crm.ts)): `issueInvoiceForPayment(paymentId)` — non-blocking, `AbortSignal.timeout(8000)`, log warn khi lỗi/non-2xx, KHÔNG throw.
  - **Guard `amountVnd <= 0` → return.** Load payment + `community.invoiceConfig`; `!cfg?.enabled` → return; `decryptSecret(authHeaderValue)`; thiếu `metadata.invoice` → log warn + return.
  - Build `items[]` theo refType (reuse logic title của /pay [page.tsx:60-135](app/pay/[paymentCode]/page.tsx#L60)):
    - `product`: nếu không có bump → 1 dòng giá `payment.amountVnd`; nếu có bump → 2 dòng: main item = `payment.amountVnd - bumpPriceVnd`, bump item = `bumpPriceVnd`.
    - `cart`: lấy `meta.breakdown`, nhưng nếu có coupon giảm một phần thì phải phân bổ discount theo tỷ lệ để tổng `items[].unit_price_vnd` = `payment.amountVnd` (không gửi tổng gốc).
    - `challenge/event/subscription/community`: 1 dòng, giá `payment.amountVnd` trừ phần bump nếu có; bump tách dòng như product.
  - Body = payload contract (mục trên), `external_ref = payment.paymentCode` (**KHÔNG dùng refId** — cart có `refId="cart"`). POST tới `cfg.endpoint` với header `{ [cfg.authHeaderName]: <decrypted>, "Content-Type":"application/json", "Accept":"application/json", "Idempotency-Key": payment.paymentCode }`.
  - Sau khi POST, update `payment.metadata.invoiceWebhook` thành `sent`/`failed` như mục lưu trữ. Lỗi/timeout vẫn không làm payment rollback.
- `lib/services/payment.ts`: trong `matchSePayTransactionToPayment`, trước `logger.info` cuối ([payment.ts:715](lib/services/payment.ts#L715)):
  ```ts
  try {
    const { issueInvoiceForPayment } = await import("@/lib/integrations/invoice-webhook");
    await issueInvoiceForPayment(payment.id);
  } catch { /* non-blocking */ }
  ```
  Giữ nguyên `notifyGettimePurchase` cũ (CRM khác mục đích). Không đụng đường free.
- `app/actions/orders.ts`: với manual approval cho payment >0đ của community bật invoice:
  - UI confirm có lựa chọn `Duyệt + gửi hóa đơn` / `Chỉ duyệt, không gửi hóa đơn`.
  - Nếu chọn gửi: sau khi complete payment, gọi `issueInvoiceForPayment(payment.id)`.
  - Nếu chọn không gửi: update `payment.metadata.invoiceWebhook = { status:"skipped", reason:"manual_approval", skippedBy, skippedAt }`.
  - Nếu community bật invoice nhưng payment thiếu `metadata.invoice`, UI phải cảnh báo rõ: không thể gửi HĐ vì buyer chưa nhập thông tin HĐ; admin vẫn có thể chỉ duyệt không gửi.

## Files
**Tạo mới:** `components/checkout/invoice-form.tsx`, `app/actions/invoice.ts`, `lib/integrations/invoice-webhook.ts`, `lib/webhook-url.ts` (hoặc helper tương đương), `prisma/migrations/<ts>_add_invoice_config/migration.sql`.
**Sửa:** `prisma/schema.prisma` (+invoiceConfig), `lib/community-config.ts`, `lib/validations.ts`, `app/actions/payment-config.ts`, `app/actions/orders.ts`, `app/c/[slug]/settings/page.tsx`, `app/pay/[paymentCode]/page.tsx`, `lib/services/payment.ts`.

## Tái dùng (sẵn có)
- `encryptSecret`/`decryptSecret` — [lib/integrations/encryption.ts](lib/integrations/encryption.ts)
- `getPaymentConfig` pattern + `CommunityConfigSource` — [lib/community-config.ts](lib/community-config.ts)
- `assertCommunityPermission(..., "manage_billing")` (OWNER+ADMIN)
- `logger.warn` + `AbortSignal.timeout` non-blocking — pattern gettime-crm
- Logic resolve title theo refType — [page.tsx:60-135](app/pay/[paymentCode]/page.tsx#L60)

## Quyết định bổ sung (đã chốt)
1. `unit_price_vnd` = **số tiền thực trả (gross, gồm VAT)**, `Math.round(Number(amountVnd))` (số nguyên VND). ⚠️ Bên nhận (gettime) PHẢI diễn giải `unit_price_vnd` là **đã gồm VAT**. Nếu hệ thống cộng VAT lên trên giá này → tổng HĐ vượt tiền buyer trả → khi đó đổi sang gửi giá chưa thuế `Math.round(amount/(1+vat/100))`.
2. Cá nhân (buyer_type=1): **CCCD BẮT BUỘC**.
3. Màn hình thành công dùng email cụ thể từ `metadata.invoice.buyer_email`: **"Hóa đơn sẽ được gửi vào {buyer_email}."**
4. `buyer_code`: bỏ qua v1 (gettime cho optional). Header gửi kèm `Accept: application/json` + `Idempotency-Key`.
5. Bật invoice trong settings chỉ thành công khi server test webhook 2xx với chính endpoint/key đang save.
6. V1 chỉ có **1 invoice webhook endpoint cho mỗi community**; settings phải label rõ ai tạo/cập nhật/test cấu hình này.

## Còn lại cần verify
- Cách gettime diễn giải `unit_price_vnd` (gross vs pre-tax) — quyết định #1 ở trên.

## Verification (end-to-end)
1. `pnpm prisma generate` + `pnpm prisma migrate dev` sạch; `pnpm tsc --noEmit` không lỗi.
2. Community A chưa bật → mua (>0đ) → `/pay` hiện QR ngay. Community B bật (endpoint test = webhook.site / RequestBin) → `/pay` hiện form HĐ, chưa submit không có QR; submit (cty+MST) → QR hiện.
3. Settings invoice: bật nhưng thiếu endpoint/key → không save; endpoint không HTTPS/private IP/localhost → không save; endpoint trả non-2xx khi test → không kích hoạt; endpoint test 2xx → save `enabled=true`.
4. Settings invoice hiển thị đúng label người tạo, người cập nhật gần nhất, người test gần nhất; sửa config không ghi đè `createdByUserId/createdAt`.
5. `SimulatePaymentButton` ép match → kiểm endpoint test nhận đúng payload: `external_ref=paymentCode`, `Idempotency-Key=paymentCode`, header auth đúng, `items[]` đúng refType, buyer_* khớp. Test product, product+bump, cart (2 SP + coupon partial), challenge.
6. Manual approval: community bật invoice + payment có invoice info → confirm cho chọn gửi/không gửi; chọn gửi thì endpoint nhận webhook; chọn không gửi thì metadata lưu `invoiceWebhook.status="skipped"`.
7. **Đơn 0đ (coupon 100%):** không form, không /pay, không webhook.
8. Bắn trùng (simulate 2 lần / gọi resend sau này) → `external_ref` + `Idempotency-Key` để bên nhận dedupe.
9. Unit test: safe webhook URL validator + items resolver theo refType + coupon allocation + bump split + `InvoiceBuyerSchema.refine` + `issueInvoiceForPayment` early-return khi amount=0.
10. Endpoint lỗi/timeout → payment vẫn `COMPLETED`, `payment.metadata.invoiceWebhook.status="failed"`, log warn.
