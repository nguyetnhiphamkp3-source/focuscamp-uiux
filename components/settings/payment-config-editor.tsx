"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePaymentConfigAction,
  regenerateWebhookKeyAction,
} from "@/app/actions/payment-config";
import {
  inputStyle,
  btnPrimary,
  btnSecondary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

const BANKS = [
  { code: "TPB", name: "TPBank" },
  { code: "MB", name: "MB Bank" },
  { code: "VCB", name: "Vietcombank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "BID", name: "BIDV" },
  { code: "CTG", name: "VietinBank" },
  { code: "STB", name: "Sacombank" },
  { code: "HDB", name: "HDBank" },
  { code: "MSB", name: "MSB" },
  { code: "SHB", name: "SHB" },
  { code: "OCB", name: "OCB" },
  { code: "LPB", name: "LienVietPostBank" },
  { code: "EIB", name: "Eximbank" },
] as const;

export function PaymentConfigEditor({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: {
    bankCode: string;
    bankAccount: string;
    bankHolder: string;
    bankName: string;
    hasSepayApiKey: boolean;
    sepayApiKeyMasked?: string;
  } | null;
}) {
  const router = useRouter();
  const [bankCode, setBankCode] = useState(initial?.bankCode ?? "");
  const [bankAccount, setBankAccount] = useState(initial?.bankAccount ?? "");
  const [bankHolder, setBankHolder] = useState(initial?.bankHolder ?? "");
  const [hasSepayApiKey, setHasSepayApiKey] = useState(initial?.hasSepayApiKey ?? false);
  const [sepayApiKeyMasked, setSepayApiKeyMasked] = useState(initial?.sepayApiKeyMasked ?? "");
  const [oneTimeSepayApiKey, setOneTimeSepayApiKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const webhookUrl = `https://focus.camp/api/sepay/webhook`;

  function submit() {
    setErr(null);
    setSaved(false);
    if (!bankCode || !bankAccount.trim() || !bankHolder.trim()) {
      setErr("Vui lòng điền đầy đủ thông tin ngân hàng");
      return;
    }
    const bank = BANKS.find((b) => b.code === bankCode);
    start(async () => {
      const res = await updatePaymentConfigAction({
        communityId,
        communitySlug,
        bankCode,
        bankAccount: bankAccount.trim(),
        bankHolder: bankHolder.trim(),
        bankName: bank?.name ?? bankCode,
      });
      if (res.ok) {
        setSaved(true);
        if (res.data?.sepayApiKey) setOneTimeSepayApiKey(res.data.sepayApiKey);
        if (res.data?.sepayApiKeyMasked) setSepayApiKeyMasked(res.data.sepayApiKeyMasked);
        if (res.data?.hasSepayApiKey) setHasSepayApiKey(true);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  function regenerateKey() {
    if (!confirm("Tạo API key mới? Key cũ sẽ không còn hoạt động.")) return;
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await regenerateWebhookKeyAction({ communityId, communitySlug });
      if (res.ok && res.data?.sepayApiKey) {
        setOneTimeSepayApiKey(res.data.sepayApiKey);
        setSepayApiKeyMasked(res.data.sepayApiKeyMasked);
        setHasSepayApiKey(true);
        setCopied(false);
        setSaved(true);
        router.refresh();
      } else {
        setErr(res.ok ? "unknown" : res.reason);
      }
    });
  }

  async function copyOneTimeKey() {
    if (!oneTimeSepayApiKey) return;
    await navigator.clipboard.writeText(oneTimeSepayApiKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const shouldShowWebhook = !!initial || hasSepayApiKey || !!oneTimeSepayApiKey;

  return (
    <section className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
      <SectionHeader
        title="Thanh toán SePay"
        subtitle="Cấu hình tài khoản ngân hàng để nhận tiền bán hàng trong cộng đồng. Tiền mua product, subscription, challenge sẽ chuyển thẳng vào TK của bạn."
      />

      <div
        style={{
          padding: 14,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Ngân hàng
            </span>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              disabled={pending}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">-- Chọn ngân hàng --</option>
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Số tài khoản
            </span>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              disabled={pending}
              placeholder="VD: 10003314573"
              style={inputStyle}
            />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Tên chủ tài khoản (viết hoa, không dấu)
          </span>
          <input
            type="text"
            value={bankHolder}
            onChange={(e) => setBankHolder(e.target.value.toUpperCase())}
            disabled={pending}
            placeholder="VD: NGUYEN VAN A"
            style={inputStyle}
          />
        </label>
      </div>

      {shouldShowWebhook && (
        <div
          style={{
            padding: 14,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--header-primary)", marginBottom: 8 }}>
            Webhook SePay
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 10px" }}>
            Copy Webhook URL vào SePay Dashboard. API key chỉ copy được ngay sau khi tạo mới.
          </p>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Webhook URL
            </span>
            <input
              type="text"
              readOnly
              value={webhookUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{ ...inputStyle, background: "var(--bg-secondary)", cursor: "copy" }}
            />
          </label>
          {(hasSepayApiKey || oneTimeSepayApiKey) && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                API Key (dán vào ô &quot;Authorization&quot; trên SePay)
              </span>
              {oneTimeSepayApiKey && (
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--warning)",
                    margin: "0 0 6px",
                  }}
                >
                  Key mới chỉ hiện một lần. Copy vào SePay ngay; rời trang là không xem lại được.
                </p>
              )}
              {!oneTimeSepayApiKey && hasSepayApiKey && (
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    margin: "0 0 6px",
                  }}
                >
                  Key đang được ẩn. Không thể copy lại key cũ; tạo key mới nếu cần đổi.
                </p>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  readOnly
                  value={oneTimeSepayApiKey || sepayApiKeyMasked || "sk_************************************"}
                  onClick={(e) => {
                    if (oneTimeSepayApiKey) (e.target as HTMLInputElement).select();
                  }}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    background: "var(--bg-secondary)",
                    cursor: oneTimeSepayApiKey ? "copy" : "default",
                    userSelect: oneTimeSepayApiKey ? "text" : "none",
                  }}
                />
                {oneTimeSepayApiKey && (
                  <button
                    type="button"
                    onClick={copyOneTimeKey}
                    disabled={pending}
                    style={{ ...btnSecondary, whiteSpace: "nowrap", fontSize: "var(--text-xs)" }}
                  >
                    {copied ? "Đã copy" : "Copy"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={regenerateKey}
                  disabled={pending}
                  style={{ ...btnSecondary, whiteSpace: "nowrap", fontSize: "var(--text-xs)" }}
                >
                  Tạo key mới
                </button>
              </div>
            </label>
          )}
        </div>
      )}

      <div style={{ display: "flex" }}>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={{ ...btnPrimary, marginLeft: "auto", opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
      </div>
      <ErrorBox msg={err} />
      <SuccessBox shown={saved} />
    </section>
  );
}
