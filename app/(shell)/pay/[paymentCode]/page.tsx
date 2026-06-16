import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildVietQRUrl } from "@/lib/sepay";
import { getInvoiceConfig } from "@/lib/community-config";
import { auth } from "@/auth";
import { PaymentStatusPoller } from "./poller";
import { BumpOfferBox } from "@/components/marketplace/bump-offer-box";
import { UpsellOfferBox } from "@/components/marketplace/upsell-offer-box";
import { SimulatePaymentButton } from "@/components/marketplace/simulate-payment-button";
import { RemovableBumpRow } from "@/components/marketplace/removable-bump-row";
import { InvoiceForm } from "@/components/checkout/invoice-form";

export const dynamic = "force-dynamic";

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

  const [payment, session] = await Promise.all([
    prisma.payment.findUnique({ where: { paymentCode } }),
    auth(),
  ]);

  if (!payment) notFound();

  const community = payment.communityId
    ? await prisma.community.findUnique({
        where: { id: payment.communityId },
        select: { ownerId: true, invoiceConfig: true, slug: true, name: true },
      })
    : null;
  const isOwner = !!(session?.user?.id && community?.ownerId === session.user.id);

  let bumpProduct: { id: string; title: string; priceVnd: number; description: string | null } | null = null;
  let upsellProduct: { id: string; title: string; priceVnd: number; description: string | null } | null = null;
  const meta = (payment.metadata ?? {}) as Record<string, unknown>;
  const invoiceConfig = community ? getInvoiceConfig(community) : null;
  const invoiceMeta =
    meta.invoice && typeof meta.invoice === "object" && !Array.isArray(meta.invoice)
      ? (meta.invoice as Record<string, unknown>)
      : null;
  const shouldCollectInvoice =
    payment.status === "PENDING" && !!invoiceConfig?.enabled && !invoiceMeta;
  const invoiceEmail =
    invoiceConfig?.enabled && typeof invoiceMeta?.buyer_email === "string"
      ? invoiceMeta.buyer_email
      : null;

  async function userOwnsNonSubscription(productId: string): Promise<boolean> {
    if (!session?.user?.id) return false;
    const prod = await prisma.product.findUnique({ where: { id: productId }, select: { isSubscription: true } });
    if (!prod || prod.isSubscription) return false;
    const owned = await prisma.purchase.findFirst({ where: { userId: session.user.id, productId, status: "COMPLETED" }, select: { id: true } });
    return !!owned;
  }

  let mainItemTitle: string | null = null;
  if (payment.refType === "product") {
    const purchase = await prisma.purchase.findUnique({
      where: { id: payment.refId },
      include: { product: { include: { bumpProduct: { select: { id: true, title: true, priceVnd: true, description: true } }, upsellProduct: { select: { id: true, title: true, priceVnd: true, description: true } } } } },
    });
    mainItemTitle = purchase?.product.title ?? null;
    if (payment.status === "PENDING" && !meta.bumpProductId && purchase?.product.bumpProduct && !(await userOwnsNonSubscription(purchase.product.bumpProduct.id))) {
      bumpProduct = { id: purchase.product.bumpProduct.id, title: purchase.product.bumpProduct.title, priceVnd: Number(purchase.product.bumpProduct.priceVnd), description: purchase.product.bumpProduct.description };
    }
    if (payment.status === "COMPLETED" && purchase?.product.upsellProduct && !(await userOwnsNonSubscription(purchase.product.upsellProduct.id))) {
      upsellProduct = { id: purchase.product.upsellProduct.id, title: purchase.product.upsellProduct.title, priceVnd: Number(purchase.product.upsellProduct.priceVnd), description: purchase.product.upsellProduct.description };
    }
  } else if (payment.refType === "challenge") {
    const member = await prisma.challengeMember.findUnique({ where: { id: payment.refId }, select: { challengeId: true } });
    if (member?.challengeId) {
      const ch = await prisma.challenge.findUnique({ where: { id: member.challengeId }, include: { bumpProduct: { select: { id: true, title: true, priceVnd: true, description: true } } } });
      mainItemTitle = ch?.title ?? null;
      if (payment.status === "PENDING" && !meta.bumpProductId && ch?.bumpProduct && !(await userOwnsNonSubscription(ch.bumpProduct.id))) {
        bumpProduct = { id: ch.bumpProduct.id, title: ch.bumpProduct.title, priceVnd: Number(ch.bumpProduct.priceVnd), description: ch.bumpProduct.description };
      }
    }
  }

  let bumpItemTitle: string | null = null;
  const bumpItemPriceVnd = meta.bumpPriceVnd ? Number(meta.bumpPriceVnd) : null;
  if (meta.bumpProductId && typeof meta.bumpProductId === "string") {
    const bumpProd = await prisma.product.findUnique({ where: { id: meta.bumpProductId }, select: { title: true } });
    bumpItemTitle = bumpProd?.title ?? null;
  }

  const bankCode = (meta.bankCode as string) || process.env.SEPAY_BANK_CODE || "MB";
  const bankAccount = payment.bankAccount || process.env.SEPAY_BANK_ACCOUNT || "";
  const bankAccountHolder = (meta.bankHolder as string) || process.env.SEPAY_BANK_HOLDER || "";
  const bankName = payment.bankName || process.env.SEPAY_BANK_NAME || "MB Bank";

  const qrUrl = bankAccount
    ? buildVietQRUrl({ bankCode, accountNumber: bankAccount, amount: Number(payment.amountVnd), paymentCode: payment.paymentCode, accountHolder: bankAccountHolder })
    : null;

  const amountFormatted = Number(payment.amountVnd).toLocaleString("vi-VN");

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-6)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 20 }}>
          {community?.slug ? (
            <Link href={`/c/${community.slug}/marketplace`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              {community.name}
            </Link>
          ) : (
            <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Trang chủ</Link>
          )}
          <span>/</span>
          <span style={{ color: "var(--text-normal)" }}>Thanh toán</span>
          <span>/</span>
          <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{paymentCode}</code>
        </div>

        {/* Status states */}
        {payment.status === "COMPLETED" ? (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <StatusBox emoji="✅" title="Đã nhận thanh toán" subtitle="Giao dịch hoàn tất." tone="success" />
            {invoiceEmail && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(27,158,117,0.08)", border: "1px solid rgba(27,158,117,0.24)", color: "var(--brand-green)", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
                Hóa đơn sẽ được gửi vào {invoiceEmail}.
              </div>
            )}
            {upsellProduct && <UpsellOfferBox upsellProduct={upsellProduct} returnUrl={returnUrl} />}
            {!upsellProduct && returnUrl && (
              <Link href={returnUrl} style={{ display: "block", marginTop: 16, padding: "12px 20px", background: "var(--brand-green)", color: "#fff", borderRadius: 10, textAlign: "center", fontWeight: 700, fontSize: "var(--text-md)", textDecoration: "none" }}>
                Tiếp tục →
              </Link>
            )}
          </div>
        ) : payment.status === "EXPIRED" ? (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <StatusBox emoji="⏱️" title="Phiên thanh toán đã hết hạn" subtitle="Hãy quay lại tạo đơn mới." tone="danger" />
          </div>
        ) : payment.status === "CANCELLED" ? (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <StatusBox emoji="✕" title="Đơn hàng đã bị hủy" subtitle="Mã thanh toán này không còn hiệu lực." tone="danger" />
          </div>
        ) : shouldCollectInvoice ? (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <InvoiceForm paymentCode={payment.paymentCode} defaultName={session?.user?.name ?? session?.user?.email?.split("@")[0] ?? ""} defaultEmail={session?.user?.email ?? ""} />
          </div>
        ) : (
          /* ── PENDING: 2-column layout ── */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "start" }}>

            {/* Left: order info + bank */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Order recap */}
              {mainItemTitle && (
                <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Đơn hàng</div>
                  <OrderRecap
                    mainTitle={mainItemTitle}
                    totalVnd={Number(payment.amountVnd)}
                    bumpTitle={bumpItemTitle}
                    bumpPriceVnd={bumpItemPriceVnd}
                    removableBump={meta.bumpProductId ? { currentPaymentCode: payment.paymentCode, returnUrl } : null}
                  />
                </div>
              )}

              {bumpProduct && (
                <BumpOfferBox currentPaymentCode={payment.paymentCode} bumpProduct={bumpProduct} returnUrl={returnUrl} />
              )}

              {/* Bank details */}
              <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Thông tin chuyển khoản</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Row label="Ngân hàng" value={bankName} />
                  <Row label="Số TK" value={bankAccount || "chưa cấu hình"} mono />
                  <Row label="Chủ TK" value={bankAccountHolder || "—"} />
                  <Row label="Số tiền" value={<span style={{ color: "#1B9E75", fontWeight: 800 }}>{amountFormatted}đ</span>} />
                  <Row label="Nội dung CK" value={
                    <code style={{ fontFamily: "ui-monospace, monospace", background: "var(--bg-elevated)", padding: "3px 8px", borderRadius: 6, color: "#1B9E75", fontWeight: 700, fontSize: 13 }}>
                      {payment.paymentCode}
                    </code>
                  } />
                </div>
                <div style={{ marginTop: 14, background: "rgba(240,178,50,0.12)", color: "#a16207", padding: "10px 12px", borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
                  ⚠️ Nội dung chuyển khoản <strong>phải có</strong> mã <code style={{ fontFamily: "ui-monospace, monospace" }}>{payment.paymentCode}</code>. App ngân hàng khi quét QR sẽ tự điền.
                </div>
              </div>

              <PaymentStatusPoller paymentCode={payment.paymentCode} />
              {isOwner && payment.refType !== "community" && (
                <SimulatePaymentButton paymentCode={payment.paymentCode} />
              )}
            </div>

            {/* Right: QR */}
            <div style={{ position: "sticky", top: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 16px", border: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--header-primary)" }}>Quét để thanh toán</div>
                {qrUrl ? (
                  <div style={{ width: "100%", background: "#fff", borderRadius: 10, padding: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} alt="VietQR" style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                ) : (
                  <div style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", padding: 24, borderRadius: 10, textAlign: "center", fontSize: 12, width: "100%" }}>
                    QR chưa sẵn sàng
                  </div>
                )}
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
                  Quét bằng app ngân hàng bất kỳ.<br />Tự động xác nhận sau vài giây.
                </div>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "#1B9E75" }}>{amountFormatted}đ</div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function OrderRecap({ mainTitle, totalVnd, bumpTitle, bumpPriceVnd, removableBump }: {
  mainTitle: string; totalVnd: number; bumpTitle: string | null; bumpPriceVnd: number | null;
  removableBump: { currentPaymentCode: string; returnUrl: string | null } | null;
}) {
  const baseVnd = bumpTitle && bumpPriceVnd ? totalVnd - bumpPriceVnd : totalVnd;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--text-normal)", flex: 1 }}>{mainTitle}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-heading)", whiteSpace: "nowrap" }}>{baseVnd.toLocaleString("vi-VN")}đ</span>
      </div>
      {bumpTitle && bumpPriceVnd && (
        <>
          {removableBump ? (
            <RemovableBumpRow title={bumpTitle} priceVnd={bumpPriceVnd} currentPaymentCode={removableBump.currentPaymentCode} returnUrl={removableBump.returnUrl} />
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-normal)", flex: 1 }}>+ {bumpTitle}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-heading)", whiteSpace: "nowrap" }}>{bumpPriceVnd.toLocaleString("vi-VN")}đ</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 8, marginTop: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-heading)" }}>Tổng</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#1B9E75", whiteSpace: "nowrap" }}>{totalVnd.toLocaleString("vi-VN")}đ</span>
          </div>
        </>
      )}
    </div>
  );
}

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
      <span style={{ color: "var(--text-muted)", fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--text-heading)", textAlign: "right", fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>
        {value}
      </span>
    </div>
  );
}
