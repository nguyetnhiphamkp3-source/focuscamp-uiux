/**
 * Transactional email templates. Each function returns { subject, html, text }
 * ready for `sendEmail()`. Pure HTML inline-style for max client compat.
 */

import { fmtVnd } from "@/lib/brand";
import { planLabel } from "@/lib/platform-plans";
import type { PlanTier } from "@/lib/platform-plans";

const APP_URL = process.env.APP_URL || "https://focus.camp";
const BRAND = "focus.camp";
const BRAND_GREEN = "#1B9E75";

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#2c2826;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e2d5;">
      <tr><td style="padding:24px 28px 8px;border-bottom:1px solid #e8e2d5;">
        <a href="${APP_URL}" style="text-decoration:none;color:${BRAND_GREEN};font-weight:800;font-size:20px;">🔥 ${BRAND}</a>
      </td></tr>
      <tr><td style="padding:28px;font-size:15px;line-height:1.6;color:#2c2826;">
        ${body}
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e8e2d5;font-size:12px;color:#7c7568;">
        <a href="${APP_URL}" style="color:#7c7568;text-decoration:underline;">${BRAND}</a>
        &middot; <a href="${APP_URL}/terms" style="color:#7c7568;text-decoration:underline;">Điều khoản</a>
        &middot; <a href="${APP_URL}/privacy" style="color:#7c7568;text-decoration:underline;">Bảo mật</a>
        &middot; <a href="mailto:support@focus.camp" style="color:#7c7568;text-decoration:underline;">Hỗ trợ</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:11px 22px;background:${BRAND_GREEN};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${escape(label)}</a>`;
}

/* ─── 1. Welcome ──────────────────────────────────────────────── */
export function welcomeEmail(input: { name: string }) {
  const name = input.name || "bạn";
  const subject = `Chào ${name}, mừng bạn đến focus.camp 🔥`;
  const html = shell(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#2c2826;">Chào ${escape(name)} 👋</h2>
     <p>Cảm ơn bạn đã đăng ký focus.camp — nền tảng cộng đồng <strong>challenge-first</strong>: kỷ luật mỗi ngày, thấy kết quả sau 21 ngày.</p>
     <p>Vài bước để bắt đầu:</p>
     <ul style="padding-left:20px;">
       <li><strong>Khám phá</strong> các cộng đồng đang mở</li>
       <li><strong>Tham gia</strong> challenge bạn quan tâm</li>
       <li>Hoặc <strong>tạo cộng đồng</strong> riêng nếu bạn là creator</li>
     </ul>
     <p style="margin:20px 0;">${btn(`${APP_URL}/discovery`, "Khám phá ngay")}</p>
     <p style="font-size:13px;color:#7c7568;">Cần hỗ trợ? Reply email này hoặc gửi tới support@focus.camp.</p>`
  );
  const text = `Chào ${name},\n\nCảm ơn bạn đã đăng ký focus.camp.\n\nKhám phá: ${APP_URL}/discovery\n\nCần hỗ trợ: support@focus.camp`;
  return { subject, html, text };
}

/* ─── 2. Payment receipt ──────────────────────────────────────── */
export function paymentReceiptEmail(input: {
  amountVnd: number;
  communityName: string;
  planTier: PlanTier;
  expiresAt: Date;
  paymentCode: string;
  transactionId: string;
}) {
  const { amountVnd, communityName, planTier, expiresAt, paymentCode, transactionId } = input;
  const subject = `Biên nhận thanh toán ${fmtVnd(amountVnd)}đ — ${communityName}`;
  const expDate = expiresAt.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const html = shell(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;">Biên nhận thanh toán</h2>
     <p>Cảm ơn bạn đã thanh toán. Cộng đồng <strong>${escape(communityName)}</strong> đã được kích hoạt.</p>
     <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
       <tr><td style="padding:8px 0;color:#7c7568;width:40%;">Gói</td><td style="padding:8px 0;font-weight:600;">${planLabel(planTier)}</td></tr>
       <tr><td style="padding:8px 0;color:#7c7568;">Số tiền</td><td style="padding:8px 0;font-weight:600;">${fmtVnd(amountVnd)}đ</td></tr>
       <tr><td style="padding:8px 0;color:#7c7568;">Hiệu lực đến</td><td style="padding:8px 0;font-weight:600;">${expDate}</td></tr>
       <tr><td style="padding:8px 0;color:#7c7568;">Mã giao dịch</td><td style="padding:8px 0;font-family:monospace;font-size:13px;">${escape(paymentCode)}</td></tr>
       <tr><td style="padding:8px 0;color:#7c7568;">Tx ngân hàng</td><td style="padding:8px 0;font-family:monospace;font-size:13px;">${escape(transactionId)}</td></tr>
     </table>
     <p style="margin:20px 0;">${btn(`${APP_URL}`, "Quay lại app")}</p>
     <p style="font-size:13px;color:#7c7568;">Lưu email này làm hoá đơn. Cần hỗ trợ: support@focus.camp.</p>`
  );
  const text = `Biên nhận: ${fmtVnd(amountVnd)}đ — ${communityName}\nGói: ${planLabel(planTier)}\nHiệu lực đến: ${expDate}\nMã: ${paymentCode} | Tx: ${transactionId}`;
  return { subject, html, text };
}

/* ─── 3. Subscription expiring (cron 7d trước hết hạn) ──────────── */
export function subscriptionExpiringEmail(input: {
  communityName: string;
  daysLeft: number;
  communitySlug: string;
}) {
  const { communityName, daysLeft, communitySlug } = input;
  const subject = `Gói cộng đồng ${communityName} hết hạn trong ${daysLeft} ngày`;
  const html = shell(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;">Gia hạn để giữ cộng đồng hoạt động</h2>
     <p>Cộng đồng <strong>${escape(communityName)}</strong> sẽ hết hạn trong <strong>${daysLeft} ngày</strong>.</p>
     <p>Sau ngày hết hạn bạn còn 7 ngày grace để gia hạn. Nếu quá grace, cộng đồng chuyển read-only — thành viên không đăng bài/check-in được.</p>
     <p style="margin:20px 0;">${btn(`${APP_URL}/c/${communitySlug}/settings`, "Gia hạn ngay")}</p>`
  );
  const text = `Gói ${communityName} hết hạn trong ${daysLeft} ngày. Gia hạn: ${APP_URL}/c/${communitySlug}/settings`;
  return { subject, html, text };
}

/* ─── 4. Subscription expired (qua expiresAt + grace) ──────────── */
export function subscriptionExpiredEmail(input: {
  communityName: string;
  communitySlug: string;
}) {
  const { communityName, communitySlug } = input;
  const subject = `${communityName} đang ở chế độ read-only — gia hạn để mở lại`;
  const html = shell(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;">Cộng đồng đã hết hạn</h2>
     <p>Cộng đồng <strong>${escape(communityName)}</strong> đã quá grace 7 ngày và chuyển read-only. Thành viên hiện không đăng bài, check-in hay tạo content được.</p>
     <p>Gia hạn để mở lại ngay lập tức:</p>
     <p style="margin:20px 0;">${btn(`${APP_URL}/c/${communitySlug}/settings`, "Gia hạn 30 ngày")}</p>`
  );
  const text = `${communityName} đã hết hạn → read-only. Gia hạn: ${APP_URL}/c/${communitySlug}/settings`;
  return { subject, html, text };
}

/* ─── 5. Challenge joined ──────────────────────────────────────── */
export function challengeJoinedEmail(input: {
  communityName: string;
  challengeName: string;
  communitySlug: string;
  challengeSlug: string;
}) {
  const { communityName, challengeName, communitySlug, challengeSlug } = input;
  const subject = `Bắt đầu hành trình: ${challengeName}`;
  const url = `${APP_URL}/c/${communitySlug}/challenges/${challengeSlug}`;
  const html = shell(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;">Bắt đầu thôi 🔥</h2>
     <p>Bạn vừa tham gia challenge <strong>${escape(challengeName)}</strong> trong cộng đồng <strong>${escape(communityName)}</strong>.</p>
     <p>Quy tắc đơn giản:</p>
     <ul style="padding-left:20px;">
       <li>Mỗi ngày 1 task — check-in xong là +5 XP</li>
       <li>Đứt streak = phải làm lại</li>
       <li>Hoàn thành = nhận badge + trả lại deposit</li>
     </ul>
     <p style="margin:20px 0;">${btn(url, "Mở challenge")}</p>
     <p style="font-size:13px;color:#7c7568;">Tip: bookmark trang challenge để check-in nhanh mỗi ngày.</p>`
  );
  const text = `Đã tham gia ${challengeName}. Mở: ${url}`;
  return { subject, html, text };
}

/* ─── 6. Refund processed ─────────────────────────────────────── */
export function refundProcessedEmail(input: {
  amountVnd: number;
  reason: string;
}) {
  const { amountVnd, reason } = input;
  const subject = `Hoàn tiền ${fmtVnd(amountVnd)}đ đã xử lý`;
  const html = shell(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;">Hoàn tiền đã xử lý</h2>
     <p>Số tiền <strong>${fmtVnd(amountVnd)}đ</strong> đã được xử lý hoàn về tài khoản nguồn.</p>
     <p><strong>Lý do:</strong> ${escape(reason)}</p>
     <p style="font-size:13px;color:#7c7568;">Tiền có thể tới sau 5-10 ngày làm việc tuỳ ngân hàng.</p>`
  );
  const text = `Hoàn tiền ${fmtVnd(amountVnd)}đ — Lý do: ${reason}`;
  return { subject, html, text };
}
