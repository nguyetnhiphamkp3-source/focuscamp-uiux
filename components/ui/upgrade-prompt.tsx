/**
 * "Nâng cấp" prompt shown when a user hits a tier gate.
 * Purely UI — does not handle payment (that's the SePay flow).
 *
 * Future: link to a /c/<slug>/upgrade page with pricing cards + payment.
 * For now shows the message + required tier.
 */
export function UpgradePrompt({
  message,
  requiredTier,
  communitySlug,
}: {
  message: string;
  requiredTier: string;
  communitySlug: string;
}) {
  return (
    <div
      style={{
        padding: "24px 20px",
        background:
          "linear-gradient(135deg, rgba(27,158,117,0.08), rgba(88,101,242,0.06))",
        border: "2px solid var(--brand-green)",
        borderRadius: 14,
        textAlign: "center",
        maxWidth: 480,
        margin: "40px auto",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
      <h3
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--header-primary)",
          marginBottom: 8,
        }}
      >
        Tính năng yêu cầu nâng cấp
      </h3>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-normal)",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      <div
        style={{
          display: "inline-flex",
          gap: 4,
          alignItems: "center",
          padding: "6px 14px",
          background: "var(--brand-green)",
          color: "#fff",
          borderRadius: 999,
          fontSize: "var(--text-sm)",
          fontWeight: 600,
        }}
      >
        Yêu cầu tier:{" "}
        <strong style={{ textTransform: "uppercase" }}>{requiredTier}</strong>
      </div>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginTop: 14,
        }}
      >
        Liên hệ admin cộng đồng hoặc chờ tính năng thanh toán tự động (đang
        hoàn thiện).
      </p>
    </div>
  );
}
