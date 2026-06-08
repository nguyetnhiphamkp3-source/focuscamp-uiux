"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveInvoiceBuyerInfoAction } from "@/app/actions/invoice";

type BuyerType = 1 | 2;

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function InvoiceForm({
  paymentCode,
  defaultName,
  defaultEmail,
}: {
  paymentCode: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [buyerType, setBuyerType] = useState<BuyerType>(1);
  const [buyerName, setBuyerName] = useState(defaultName);
  const [buyerEmail, setBuyerEmail] = useState(defaultEmail);
  const [buyerLegalName, setBuyerLegalName] = useState("");
  const [buyerTaxCode, setBuyerTaxCode] = useState("");
  const [buyerNationalId, setBuyerNationalId] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!buyerName.trim()) {
      setErr("Nhập tên người mua");
      return;
    }
    if (!buyerEmail.trim()) {
      setErr("Nhập email nhận hóa đơn");
      return;
    }
    if (buyerType === 1 && !buyerNationalId.trim()) {
      setErr("Nhập CCCD");
      return;
    }
    if (buyerType === 2 && (!buyerLegalName.trim() || !buyerTaxCode.trim())) {
      setErr("Nhập tên pháp lý công ty và mã số thuế");
      return;
    }

    setPending(true);
    const res = await saveInvoiceBuyerInfoAction({
      paymentCode,
      buyer_type: buyerType,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_legal_name: buyerLegalName,
      buyer_tax_code: buyerTaxCode,
      buyer_national_id: buyerNationalId,
      buyer_address: buyerAddress,
      buyer_phone: buyerPhone,
    });
    setPending(false);
    if (res.ok) {
      router.refresh();
    } else {
      setErr(res.reason);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          margin: "8px 0 0",
          lineHeight: 1.5,
        }}
      >
        Cộng đồng này đang bật xuất hóa đơn. Nhập thông tin hóa đơn trước khi quét QR thanh toán.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setBuyerType(1)}
          disabled={pending}
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: buyerType === 1 ? "1px solid var(--brand-green)" : "1px solid var(--border-subtle)",
            background: buyerType === 1 ? "rgba(27,158,117,0.12)" : "transparent",
            color: buyerType === 1 ? "var(--brand-green)" : "var(--text-normal)",
            fontWeight: 700,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          Cá nhân
        </button>
        <button
          type="button"
          onClick={() => setBuyerType(2)}
          disabled={pending}
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: buyerType === 2 ? "1px solid var(--brand-green)" : "1px solid var(--border-subtle)",
            background: buyerType === 2 ? "rgba(27,158,117,0.12)" : "transparent",
            color: buyerType === 2 ? "var(--brand-green)" : "var(--text-normal)",
            fontWeight: 700,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          Công ty
        </button>
      </div>

      <Field label="Tên người mua">
        <input
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          disabled={pending}
          style={inputStyle}
        />
      </Field>

      <Field label="Email nhận hóa đơn">
        <input
          type="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          disabled={pending}
          style={inputStyle}
        />
      </Field>

      {buyerType === 1 ? (
        <Field label="CCCD">
          <input
            value={buyerNationalId}
            onChange={(e) => setBuyerNationalId(e.target.value)}
            disabled={pending}
            style={inputStyle}
          />
        </Field>
      ) : (
        <>
          <Field label="Tên pháp lý công ty">
            <input
              value={buyerLegalName}
              onChange={(e) => setBuyerLegalName(e.target.value)}
              disabled={pending}
              style={inputStyle}
            />
          </Field>
          <Field label="Mã số thuế">
            <input
              value={buyerTaxCode}
              onChange={(e) => setBuyerTaxCode(e.target.value)}
              disabled={pending}
              style={inputStyle}
            />
          </Field>
        </>
      )}

      <Field label="Địa chỉ">
        <input
          value={buyerAddress}
          onChange={(e) => setBuyerAddress(e.target.value)}
          disabled={pending}
          style={inputStyle}
        />
      </Field>

      <Field label="Số điện thoại">
        <input
          value={buyerPhone}
          onChange={(e) => setBuyerPhone(e.target.value)}
          disabled={pending}
          style={inputStyle}
        />
      </Field>

      {err && (
        <div
          style={{
            color: "var(--danger)",
            background: "rgba(218,55,60,0.08)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: "var(--text-sm)",
          }}
        >
          {err}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        style={{
          padding: "11px 18px",
          borderRadius: 8,
          border: "none",
          background: "var(--brand-green)",
          color: "#fff",
          fontWeight: 700,
          fontSize: "var(--text-md)",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.65 : 1,
        }}
      >
        {pending ? "Đang lưu..." : "Tiếp tục đến QR thanh toán"}
      </button>
    </div>
  );
}
