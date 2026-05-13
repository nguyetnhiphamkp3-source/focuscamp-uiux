import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildVietQRUrl } from "@/lib/sepay";
import { PaymentStatusPoller } from "./poller";
import { BumpOfferBox } from "@/components/marketplace/bump-offer-box";

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

  let bumpProduct: { id: string; title: string; priceVnd: number; description: string | null } | null = null;
  const meta = (payment.metadata ?? {}) as Record<string, unknown>;

  // Load main item title and (conditionally) bump offer product
  let mainItemTitle: string | null = null;
  if (payment.refType === "product") {
    const purchase = await prisma.purchase.findUnique({
      where: { id: payment.refId },
      include: {
        product: {
          include: {
            bumpProduct: { select: { id: true, title: true, priceVnd: true, description: true } },
          },
        },
      },
    });
    mainItemTitle = purchase?.product.title ?? null;
    if (payment.status === "PENDING" && !meta.bumpProductId && purchase?.product.bumpProduct) {
      bumpProduct = {
        id: purchase.product.bumpProduct.id,
        title: purchase.product.bumpProduct.title,
        priceVnd: Number(purchase.product.bumpProduct.priceVnd),
        description: purchase.product.bumpProduct.description,
      };
    }
  } else if (payment.refType === "challenge") {
    const member = await prisma.challengeMember.findUnique({
      where: { id: payment.refId },
      select: { challengeId: true },
    });
    if (member?.challengeId) {
      const ch = await prisma.challenge.findUnique({
        where: { id: member.challengeId },
        include: { bumpProduct: { select: { id: true, title: true, priceVnd: true, description: true } } },
      });
      mainItemTitle = ch?.title ?? null;
      if (payment.status === "PENDING" && !meta.bumpProductId && ch?.bumpProduct) {
        bumpProduct = {
          id: ch.bumpProduct.id,
          title: ch.bumpProduct.title,
          priceVnd: Number(ch.bumpProduct.priceVnd),
          description: ch.bumpProduct.description,
        };
      }
    }
  }

  // Load bump item info for recap when bump already applied
  let bumpItemTitle: string | null = null;
  const bumpItemPriceVnd = meta.bumpPriceVnd ? Number(meta.bumpPriceVnd) : null;
  if (meta.bumpProductId && typeof meta.bumpProductId === "string") {
    const bumpProd = await prisma.product.findUnique({
      where: { id: meta.bumpProductId },
      select: { title: true },
    });
    bumpItemTitle = bumpProd?.title ?? null;
  }

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

            {mainItemTitle && (
              <OrderRecap
                mainTitle={mainItemTitle}
                totalVnd={Number(payment.amountVnd)}
                bumpTitle={bumpItemTitle}
                bumpPriceVnd={bumpItemPriceVnd}
              />
            )}

            {bumpProduct && (
              <BumpOfferBox
                currentPaymentCode={payment.paymentCode}
                bumpProduct={bumpProduct}
                returnUrl={returnUrl}
              />
            )}

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

function OrderRecap({
  mainTitle,
  totalVnd,
  bumpTitle,
  bumpPriceVnd,
}: {
  mainTitle: string;
  totalVnd: number;
  bumpTitle: string | null;
  bumpPriceVnd: number | null;
}) {
  const baseVnd = bumpTitle && bumpPriceVnd ? totalVnd - bumpPriceVnd : totalVnd;
  return (
    <div
      style={{
        width: "100%",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-muted)",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Đơn hàng
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--text-body)", flex: 1 }}>{mainTitle}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-heading)", whiteSpace: "nowrap" }}>
            {baseVnd.toLocaleString("vi-VN")}đ
          </span>
        </div>
        {bumpTitle && bumpPriceVnd && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-body)", flex: 1 }}>+ {bumpTitle}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-heading)", whiteSpace: "nowrap" }}>
                {bumpPriceVnd.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 8,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-heading)" }}>Tổng</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--brand-green)", whiteSpace: "nowrap" }}>
                {totalVnd.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </>
        )}
      </div>
    </div>
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
