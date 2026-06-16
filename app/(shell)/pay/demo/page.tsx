"use client";

import { useState } from "react";
import Link from "next/link";

type State = "pending" | "completed" | "expired" | "cancelled";

const MOCK = {
  paymentCode: "DEMO-2024-ABC123",
  amountVnd: 199000,
  bankName: "MB Bank",
  bankAccount: "1234567890",
  bankHolder: "NGUYEN VAN A",
  mainTitle: "TikTok Organic Playbook cho Digital Seller VN",
};

const STATES: { key: State; label: string }[] = [
  { key: "pending",   label: "Chờ thanh toán" },
  { key: "completed", label: "Đã thanh toán" },
  { key: "expired",   label: "Hết hạn" },
  { key: "cancelled", label: "Đã huỷ" },
];

function fmtVnd(n: number) { return n.toLocaleString("vi-VN"); }

function StatusBox({ emoji, title, subtitle, tone }: { emoji: string; title: string; subtitle: string; tone: "success" | "danger" }) {
  const palette = tone === "success"
    ? { bg: "rgba(27,158,117,0.08)", border: "rgba(27,158,117,0.3)", text: "#1B9E75" }
    : { bg: "rgba(242,63,67,0.08)", border: "rgba(242,63,67,0.3)", text: "#e53e3e" };
  return (
    <div style={{ background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 24, textAlign: "center", margin: "16px 0" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: palette.text }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>{subtitle}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--text-heading)", textAlign: "right", fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>
        {value}
      </span>
    </div>
  );
}

function PendingView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "start" }}>
      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Đơn hàng</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-normal)", flex: 1 }}>{MOCK.mainTitle}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-heading)", whiteSpace: "nowrap" }}>{fmtVnd(MOCK.amountVnd)}đ</span>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Thông tin chuyển khoản</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Ngân hàng" value={MOCK.bankName} />
            <Row label="Số TK" value={MOCK.bankAccount} mono />
            <Row label="Chủ TK" value={MOCK.bankHolder} />
            <Row label="Số tiền" value={<span style={{ color: "#1B9E75", fontWeight: 800 }}>{fmtVnd(MOCK.amountVnd)}đ</span>} />
            <Row label="Nội dung CK" value={
              <code style={{ fontFamily: "ui-monospace, monospace", background: "var(--bg-elevated)", padding: "3px 8px", borderRadius: 6, color: "#1B9E75", fontWeight: 700, fontSize: 13 }}>
                {MOCK.paymentCode}
              </code>
            } />
          </div>
          <div style={{ marginTop: 14, background: "rgba(240,178,50,0.12)", color: "#a16207", padding: "10px 12px", borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
            ⚠️ Nội dung chuyển khoản <strong>phải có</strong> mã{" "}
            <code style={{ fontFamily: "ui-monospace, monospace" }}>{MOCK.paymentCode}</code>.
            App ngân hàng khi quét QR sẽ tự điền.
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: 8 }}>⏳ Đang chờ chuyển khoản…</div>

        <button
          type="button"
          style={{ padding: "10px 16px", background: "transparent", border: "1px dashed rgba(0,0,0,0.15)", borderRadius: 8, color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer" }}
        >
          🧪 Giả lập thanh toán thành công (owner only)
        </button>
      </div>

      {/* Right: QR */}
      <div style={{ position: "sticky", top: 16 }}>
        <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 16px", border: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--header-primary)" }}>Quét để thanh toán</div>
          <div style={{ width: "100%", background: "#fff", borderRadius: 10, padding: 12, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="24" height="24" rx="3" stroke="#1B9E75" strokeWidth="3" fill="none"/>
              <rect x="8" y="8" width="12" height="12" rx="1" fill="#1B9E75"/>
              <rect x="38" y="2" width="24" height="24" rx="3" stroke="#1B9E75" strokeWidth="3" fill="none"/>
              <rect x="44" y="8" width="12" height="12" rx="1" fill="#1B9E75"/>
              <rect x="2" y="38" width="24" height="24" rx="3" stroke="#1B9E75" strokeWidth="3" fill="none"/>
              <rect x="8" y="44" width="12" height="12" rx="1" fill="#1B9E75"/>
              <rect x="38" y="38" width="6" height="6" rx="1" fill="#1B9E75"/>
              <rect x="50" y="38" width="6" height="6" rx="1" fill="#1B9E75"/>
              <rect x="38" y="50" width="6" height="6" rx="1" fill="#1B9E75"/>
              <rect x="50" y="50" width="6" height="6" rx="1" fill="#1B9E75"/>
              <rect x="28" y="2" width="6" height="6" rx="1" fill="#1B9E75"/>
              <rect x="28" y="14" width="6" height="6" rx="1" fill="#1B9E75"/>
              <rect x="2" y="28" width="6" height="6" rx="1" fill="#1B9E75"/>
              <rect x="14" y="28" width="6" height="6" rx="1" fill="#1B9E75"/>
              <rect x="28" y="28" width="6" height="6" rx="1" fill="#1B9E75"/>
            </svg>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>VietQR (demo)</span>
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
            Quét bằng app ngân hàng bất kỳ.<br />Tự động xác nhận sau vài giây.
          </div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "#1B9E75" }}>{fmtVnd(MOCK.amountVnd)}đ</div>
        </div>
      </div>
    </div>
  );
}

export default function PayDemoPage() {
  const [state, setState] = useState<State>("pending");

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-6)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 20 }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Trang chủ</Link>
          <span>/</span>
          <span style={{ color: "var(--text-normal)" }}>Thanh toán · Demo</span>
        </div>

        {/* State switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "var(--bg-card)", padding: "6px", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", width: "fit-content" }}>
          {STATES.map((s) => {
            const active = state === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setState(s.key)}
                style={{
                  padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: active ? "#1B9E75" : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                  fontWeight: active ? 700 : 400,
                  fontSize: "var(--text-sm)",
                  transition: "all 120ms",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {state === "pending"   && <PendingView />}
        {state === "completed" && (
          <div style={{ maxWidth: 480 }}>
            <StatusBox emoji="✅" title="Đã nhận thanh toán" subtitle="Giao dịch hoàn tất." tone="success" />
            <Link href="#" style={{ display: "block", marginTop: 16, padding: "12px 20px", background: "#1B9E75", color: "#fff", borderRadius: 10, textAlign: "center", fontWeight: 700, fontSize: "var(--text-md)", textDecoration: "none" }}>
              Tiếp tục →
            </Link>
          </div>
        )}
        {state === "expired"   && <div style={{ maxWidth: 480 }}><StatusBox emoji="⏱️" title="Phiên thanh toán đã hết hạn" subtitle="Hãy quay lại tạo đơn mới." tone="danger" /></div>}
        {state === "cancelled" && <div style={{ maxWidth: 480 }}><StatusBox emoji="✕" title="Đơn hàng đã bị huỷ" subtitle="Mã thanh toán này không còn hiệu lực." tone="danger" /></div>}

      </div>
    </div>
  );
}
