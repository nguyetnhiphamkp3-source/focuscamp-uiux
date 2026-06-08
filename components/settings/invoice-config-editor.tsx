"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  testInvoiceWebhookAction,
  updateInvoiceConfigAction,
} from "@/app/actions/payment-config";
import {
  inputStyle,
  btnPrimary,
  btnSecondary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

type VatRate = -2 | -1 | 0 | 5 | 8 | 10;
type PaymentMethod = "TM" | "CK" | "TM/CK" | "KHAC";

type InitialInvoiceConfig = {
  enabled: boolean;
  endpoint: string;
  authHeaderName: string;
  hasAuthHeaderValue: boolean;
  vatRate: VatRate;
  paymentMethod: PaymentMethod;
  unit: string;
  audit: {
    createdBy: string | null;
    createdAt: string | null;
    updatedBy: string | null;
    updatedAt: string | null;
    lastTestedBy: string | null;
    lastTestAt: string | null;
    lastTestOk: boolean | null;
  };
};

const VAT_RATES: Array<{ value: VatRate; label: string }> = [
  { value: 10, label: "10%" },
  { value: 8, label: "8%" },
  { value: 5, label: "5%" },
  { value: 0, label: "0%" },
  { value: -1, label: "Không chịu thuế" },
  { value: -2, label: "Không kê khai" },
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CK", label: "Chuyển khoản" },
  { value: "TM", label: "Tiền mặt" },
  { value: "TM/CK", label: "Tiền mặt / chuyển khoản" },
  { value: "KHAC", label: "Khác" },
];

function fmtDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("vi-VN");
}

function AuditLine({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
      <strong style={{ color: "var(--text-normal)" }}>{label}:</strong> {children}
    </div>
  );
}

export function InvoiceConfigEditor({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: InitialInvoiceConfig;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [endpoint, setEndpoint] = useState(initial.endpoint);
  const [authHeaderName, setAuthHeaderName] = useState(initial.authHeaderName);
  const [authHeaderValue, setAuthHeaderValue] = useState("");
  const [vatRate, setVatRate] = useState<VatRate>(initial.vatRate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial.paymentMethod);
  const [unit, setUnit] = useState(initial.unit);
  const [loading, setLoading] = useState<"test" | "save" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tested, setTested] = useState<string | null>(null);

  function validateLocal(requireEnabled: boolean): string | null {
    if (!requireEnabled && !enabled) return null;
    if (!endpoint.trim()) return "Endpoint webhook là bắt buộc";
    if (!authHeaderName.trim()) return "Header name là bắt buộc";
    if (!authHeaderValue.trim() && !initial.hasAuthHeaderValue) {
      return "Header value/key là bắt buộc";
    }
    if (!unit.trim()) return "Đơn vị tính là bắt buộc";
    return null;
  }

  async function testWebhook() {
    const localError = validateLocal(true);
    if (localError) {
      setErr(localError);
      return;
    }
    setErr(null);
    setSaved(false);
    setTested(null);
    setLoading("test");
    const res = await testInvoiceWebhookAction({
      communityId,
      enabled: true,
      endpoint,
      authHeaderName,
      authHeaderValue,
      vatRate,
      paymentMethod,
      unit,
    });
    setLoading(null);
    if (res.ok) {
      setTested(`Test thành công (${res.data?.status ?? 200})`);
    } else {
      setErr(res.reason);
    }
  }

  async function saveConfig() {
    const localError = validateLocal(enabled);
    if (localError) {
      setErr(localError);
      return;
    }
    setErr(null);
    setSaved(false);
    setTested(null);
    setLoading("save");
    const res = await updateInvoiceConfigAction({
      communityId,
      communitySlug,
      enabled,
      endpoint,
      authHeaderName,
      authHeaderValue,
      vatRate,
      paymentMethod,
      unit,
    });
    setLoading(null);
    if (res.ok) {
      setSaved(true);
      setAuthHeaderValue("");
      router.refresh();
    } else {
      setErr(res.reason);
    }
  }

  const pending = loading !== null;
  const audit = initial.audit;

  return (
    <section className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
      <SectionHeader
        title="Xuất hóa đơn qua webhook"
        subtitle="Mỗi community có một webhook invoice duy nhất. Khi bật, người mua phải nhập thông tin hóa đơn trước khi thấy QR thanh toán."
      />

      <div
        style={{
          padding: 14,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={pending}
          />
          <span style={{ fontWeight: 700, color: "var(--header-primary)", fontSize: "var(--text-base)" }}>
            Bật xuất hóa đơn
          </span>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Endpoint webhook
          </span>
          <input
            type="url"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            disabled={pending}
            placeholder="https://invoice.example.com/focuscamp"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Header name
            </span>
            <input
              type="text"
              value={authHeaderName}
              onChange={(e) => setAuthHeaderName(e.target.value)}
              disabled={pending}
              placeholder="X-Api-Key"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Header value/key
            </span>
            <input
              type="password"
              value={authHeaderValue}
              onChange={(e) => setAuthHeaderValue(e.target.value)}
              disabled={pending}
              placeholder={initial.hasAuthHeaderValue ? "Để trống để giữ key cũ" : "Nhập key webhook"}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              VAT
            </span>
            <select
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
              disabled={pending}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {VAT_RATES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Phương thức thanh toán
            </span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={pending}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Đơn vị tính
            </span>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={pending}
              placeholder="lần"
              style={inputStyle}
            />
          </label>
        </div>
      </div>

      {(audit.createdBy || audit.updatedBy || audit.lastTestAt) && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginBottom: 12,
          }}
        >
          <AuditLine label="Tạo bởi">
            {audit.createdBy ? `${audit.createdBy}${audit.createdAt ? ` lúc ${fmtDate(audit.createdAt)}` : ""}` : null}
          </AuditLine>
          <AuditLine label="Cập nhật gần nhất">
            {audit.updatedBy ? `${audit.updatedBy}${audit.updatedAt ? ` lúc ${fmtDate(audit.updatedAt)}` : ""}` : null}
          </AuditLine>
          <AuditLine label="Test gần nhất">
            {audit.lastTestAt
              ? `${audit.lastTestedBy ?? "Không rõ"} lúc ${fmtDate(audit.lastTestAt)}: ${audit.lastTestOk ? "thành công" : "thất bại"}`
              : null}
          </AuditLine>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={testWebhook}
          disabled={pending}
          style={{ ...btnSecondary, opacity: pending ? 0.6 : 1 }}
        >
          {loading === "test" ? "Đang test..." : "Test webhook"}
        </button>
        <button
          type="button"
          onClick={saveConfig}
          disabled={pending}
          style={{ ...btnPrimary, marginLeft: "auto", opacity: pending ? 0.6 : 1 }}
        >
          {loading === "save" ? "Đang lưu..." : enabled ? "Lưu và kích hoạt" : "Lưu cấu hình"}
        </button>
      </div>
      <ErrorBox msg={err} />
      {tested && (
        <div
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--success)",
            padding: "6px 10px",
            background: "rgba(36,128,70,0.08)",
            borderRadius: 6,
            marginTop: 8,
          }}
        >
          {tested}
        </div>
      )}
      <SuccessBox shown={saved} />
    </section>
  );
}
