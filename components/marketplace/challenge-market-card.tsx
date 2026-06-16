import Link from "next/link";
import { fmtVnd } from "./product-card";

type PricingConfig = { guestVnd?: number; memberVnd?: number } | null;

export function ChallengeMarketCard({
  communitySlug,
  challenge,
  isJoined,
}: {
  communitySlug: string;
  challenge: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    difficulty: string;
    requiredDays: number;
    bannerUrl: string | null;
    bannerMediaType?: string | null;
    pricingConfig: unknown;
    _count: { members: number };
  };
  isJoined: boolean;
}) {
  const cfg = challenge.pricingConfig as PricingConfig;
  const guestPrice = cfg?.guestVnd ?? 0;
  const memberPrice = cfg?.memberVnd;
  const diffColor = challenge.difficulty === "HARD" ? "#c97a3f" : challenge.difficulty === "CHAOS" ? "#b8455a" : "#3a8a70";
  const diffLabel = challenge.difficulty === "HARD" ? "⚔️ Hard" : challenge.difficulty === "CHAOS" ? "🔥 Chaos" : "🛡️ Normal";

  return (
    <Link
      href={`/c/${communitySlug}/challenges/${challenge.slug}`}
      style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", background: "var(--bg-card)", border: `1px solid ${diffColor}33`, borderRadius: 14, overflow: "hidden", transition: "box-shadow 0.15s, transform 0.15s" }}
      className="ch-market-card"
    >
      {/* Banner */}
      <div
        style={{
          aspectRatio: "16 / 9",
          background: challenge.bannerUrl
            ? `url("${challenge.bannerUrl}") center/cover no-repeat`
            : `linear-gradient(135deg, ${diffColor} 0%, ${diffColor}99 100%)`,
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          padding: "10px 14px",
        }}
      >
        {challenge.bannerMediaType === "VIDEO" && (
          <span className="ch-card-play-badge" aria-hidden="true">▶</span>
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            backdropFilter: "blur(4px)",
            border: `1px solid ${diffColor}88`,
          }}
        >
          {diffLabel}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 10,
            background: `${diffColor}cc`,
            color: "#fff",
          }}
        >
          {challenge.requiredDays} ngày
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: "var(--text-md)", fontWeight: 800, color: "var(--text-heading)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {challenge.title}
        </div>
        {challenge.description && (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {challenge.description}
          </div>
        )}
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "auto", paddingTop: 6 }}>
          👥 {challenge._count.members} thành viên
        </div>

        {/* Price row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border-subtle)", marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--success)" }}>
              {guestPrice > 0 ? `${fmtVnd(guestPrice)}đ` : "Miễn phí"}
            </span>
            {memberPrice !== undefined && memberPrice < guestPrice && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Member: {fmtVnd(memberPrice)}đ
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              padding: "6px 14px",
              borderRadius: 7,
              background: isJoined ? "transparent" : "var(--brand-green)",
              color: isJoined ? "var(--success)" : "#fff",
              border: isJoined ? "1px solid var(--success)" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {isJoined ? "Đã tham gia ✓" : "Đăng ký →"}
          </span>
        </div>
      </div>
    </Link>
  );
}
