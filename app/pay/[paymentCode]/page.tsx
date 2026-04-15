import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildVietQRUrl } from "@/lib/sepay";
import { PaymentStatusPoller } from "./poller";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ paymentCode: string }>;
}) {
  const { paymentCode } = await params;

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
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-body)" }}
    >
      <div
        className="max-w-lg w-full rounded-2xl p-8"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 3px rgba(60, 45, 20, 0.08)",
        }}
      >
        <div className="text-4xl mb-2">💸</div>
        <h1
          className="text-2xl font-extrabold mb-2"
          style={{ color: "var(--text-heading)" }}
        >
          Thanh toán
        </h1>

        {payment.status === "COMPLETED" ? (
          <div
            className="rounded-lg p-6 text-center my-4"
            style={{
              background: "var(--brand-green-soft)",
              border: "1px solid var(--brand-green)",
            }}
          >
            <div className="text-4xl mb-2">✅</div>
            <div
              className="font-bold text-lg"
              style={{ color: "var(--brand-green)" }}
            >
              Đã nhận thanh toán
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              Giao dịch hoàn tất. Bạn có thể đóng trang này.
            </div>
          </div>
        ) : payment.status === "EXPIRED" ? (
          <div
            className="rounded-lg p-6 text-center my-4"
            style={{
              background: "rgba(242, 63, 67, 0.08)",
              border: "1px solid var(--dnd-red)",
            }}
          >
            <div className="text-4xl mb-2">⏱️</div>
            <div
              className="font-bold text-lg"
              style={{ color: "var(--dnd-red)" }}
            >
              Phiên thanh toán đã hết hạn
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              Hãy quay lại tạo đơn mới.
            </div>
          </div>
        ) : (
          <>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--text-muted)" }}
            >
              Quét QR bằng app ngân hàng, hoặc chuyển khoản theo thông tin bên
              dưới. Giao dịch được ghi nhận tự động trong vài giây.
            </p>

            <div className="grid gap-4" style={{ gridTemplateColumns: "220px 1fr" }}>
              {qrUrl ? (
                <div
                  className="rounded-lg p-2"
                  style={{
                    background: "#fff",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="VietQR"
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div
                  className="rounded-lg p-8 text-center text-xs"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-muted)",
                  }}
                >
                  QR chưa sẵn sàng — SEPAY_BANK_ACCOUNT chưa set trong .env
                </div>
              )}

              <div className="flex flex-col gap-2 text-sm">
                <Row label="Ngân hàng" value={bankName} />
                <Row label="Số TK" value={bankAccount || "chưa cấu hình"} />
                <Row label="Chủ TK" value={bankAccountHolder || "—"} />
                <Row
                  label="Số tiền"
                  value={
                    <span
                      style={{
                        color: "var(--brand-green)",
                        fontWeight: 800,
                      }}
                    >
                      {amountFormatted}đ
                    </span>
                  }
                />
                <Row
                  label="Nội dung CK"
                  value={
                    <code
                      className="font-mono text-base"
                      style={{
                        background: "var(--bg-elevated)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        color: "var(--brand-green)",
                        fontWeight: 700,
                      }}
                    >
                      {payment.paymentCode}
                    </code>
                  }
                />
              </div>
            </div>

            <div
              className="mt-6 rounded-lg p-3 text-xs"
              style={{
                background: "rgba(240, 178, 50, 0.12)",
                color: "#a16207",
              }}
            >
              ⚠️ Nội dung chuyển khoản <strong>phải có</strong> mã{" "}
              <code>{payment.paymentCode}</code> để hệ thống tự nhận. App ngân
              hàng khi quét QR sẽ tự điền.
            </div>

            <PaymentStatusPoller paymentCode={payment.paymentCode} />
          </>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span style={{ color: "var(--text-muted)" }}>{label}:</span>
      <span
        className="font-semibold text-right"
        style={{ color: "var(--text-heading)" }}
      >
        {value}
      </span>
    </div>
  );
}
