import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildVietQRUrl } from "@/lib/sepay";
import { PaymentStatusPoller } from "./poller";

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentCode: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { paymentCode } = await params;
  const sp = await searchParams;
  const returnUrl = sp.return && sp.return.startsWith("/") ? sp.return : null;

  const payment = await prisma.payment.findUnique({
    where: { paymentCode },
  });

  if (!payment) notFound();

  const bankCode = process.env.SEPAY_BANK_CODE || "MB";
  const bankAccount = process.env.SEPAY_BANK_ACCOUNT || "";
  const bankAccountHolder = process.env.SEPAY_BANK_HOLDER || "";
  const bankName = process.env.SEPAY_BANK_NAME || "MB Bank";

  const qrUrl = bankAccount
    ? buildVietQRUrl({
        bankCode,
        accountNumber: bankAccount,
        amount: Number(payment.amountVnd),
        paymentCode: payment.paymentCode,
        accountHolder: bankAccountHolder,
      })
    : null;

  const amountFormatted = Number(payment.amountVnd).toLocaleString("vi-VN");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg-body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 20,
          boxShadow: "0 1px 3px rgba(60, 45, 20, 0.08)",
          padding: 28,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-block",
            fontSize: 28,
            marginBottom: 8,
            textDecoration: "none",
          }}
        >
          🔥🏕️
        </Link>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-heading)",
            margin: "4px 0 4px",
          }}
        >
          Thanh toán
        </h1>

        {payment.status === "COMPLETED" ? (
          <>
            <StatusBox
              emoji="✅"
              title="Đã nhận thanh toán"
              subtitle="Giao dịch hoàn tất."
              tone="success"
            />
            {returnUrl && (
              <Link
                href={returnUrl}
                style={{
                  display: "block",
                  marginTop: 16,
                  padding: "12px 20px",
                  background: "var(--brand-green)",
                  color: "#fff",
                  borderRadius: 10,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "var(--text-md)",
                  textDecoration: "none",
                }}
              >
                Tiếp tục →
              </Link>
            )}
          </>
        ) : payment.status === "EXPIRED" ? (
          <StatusBox
            emoji="⏱️"
            title="Phiên thanh toán đã hết hạn"
            subtitle="Hãy quay lại tạo đơn mới."
            tone="danger"
          />
        ) : (
          <>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                margin: "8px 0 20px",
                lineHeight: 1.5,
              }}
            >
              Quét QR bằng app ngân hàng. Giao dịch tự động ghi nhận trong vài
              giây.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {qrUrl ? (
                <div
                  style={{
                    width: 240,
                    background: "#fff",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    padding: 8,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="VietQR"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-muted)",
                    padding: 24,
                    borderRadius: 12,
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  QR chưa sẵn sàng — SEPAY_BANK_ACCOUNT chưa set
                </div>
              )}

              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  fontSize: 14,
                }}
              >
                <Row label="Ngân hàng" value={bankName} />
                <Row label="Số TK" value={bankAccount || "chưa cấu hình"} mono />
                <Row label="Chủ TK" value={bankAccountHolder || "—"} />
                <Row
                  label="Số tiền"
                  value={
                    <span
                      style={{ color: "var(--brand-green)", fontWeight: 800 }}
                    >
                      {amountFormatted}đ
                    </span>
                  }
                />
                <Row
                  label="Nội dung CK"
                  value={
                    <code
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        background: "var(--bg-elevated)",
                        padding: "3px 8px",
                        borderRadius: 6,
                        color: "var(--brand-green)",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {payment.paymentCode}
                    </code>
                  }
                />
              </div>

              <div
                style={{
                  width: "100%",
                  background: "rgba(240, 178, 50, 0.12)",
                  color: "#a16207",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.5,
                  marginTop: 4,
                }}
              >
                ⚠️ Nội dung chuyển khoản <strong>phải có</strong> mã{" "}
                <code style={{ fontFamily: "ui-monospace, monospace" }}>
                  {payment.paymentCode}
                </code>
                . App ngân hàng khi quét QR sẽ tự điền.
              </div>
            </div>

            <PaymentStatusPoller paymentCode={payment.paymentCode} />
          </>
        )}
      </div>
    </main>
  );
}

function StatusBox({
  emoji,
  title,
  subtitle,
  tone,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  tone: "success" | "danger";
}) {
  const palette =
    tone === "success"
      ? {
          bg: "var(--brand-green-soft)",
          border: "var(--brand-green)",
          text: "var(--brand-green)",
        }
      : {
          bg: "rgba(242, 63, 67, 0.08)",
          border: "var(--dnd-red)",
          text: "var(--dnd-red)",
        };
  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: 24,
        textAlign: "center",
        margin: "16px 0",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: palette.text }}>
        {title}
      </div>
      <div
        style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: "var(--text-heading)",
          textAlign: "right",
          fontFamily: mono
            ? "ui-monospace, monospace"
            : "var(--font-body, inherit)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
