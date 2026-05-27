import type { JSX } from "react";
import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";

type SalesProps = {
  challenge: {
    title: string;
    description: string | null;
    pitch: string | null;
    /** Admin-customised "Bạn sẽ có được gì?" bullets. Null/empty → derived defaults. */
    benefits?: Array<{ icon?: string; text: string }> | null;
    requiredDays: number;
    difficulty: string;
    bannerUrl: string | null;
    autoStartAfterHours: number | null;
    _count: { members: number };
    tasks: { id: string; dayNumber: number; title: string }[];
    products: { id: string; relevance: string; product: { title: string; isFree: boolean; priceVnd: unknown } }[];
  };
  effectivePrice: { vnd: number; canPayAip: boolean; aipPrice: number; aipBalance: number } | null;
  joinButton: JSX.Element;
  communitySlug: string;
};

const DIFF_COLOR: Record<string, string> = {
  HARD: "#c97a3f",
  CHAOS: "#b8455a",
  NORMAL: "#3a8a70",
};

export function ChallengeSalesIntro({ challenge, effectivePrice, joinButton }: SalesProps) {
  const accent = DIFF_COLOR[challenge.difficulty] ?? DIFF_COLOR.NORMAL;
  const diffLabel = challenge.difficulty === "HARD" ? "⚔️ Hard" : challenge.difficulty === "CHAOS" ? "🔥 Chaos" : "🛡️ Normal";
  const priceVnd = effectivePrice?.vnd ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", marginTop: "var(--space-2)" }}>

      {/* ── Social proof bar ── */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[
          { icon: "👥", value: String(challenge._count.members), label: "thành viên" },
          { icon: "📅", value: String(challenge.requiredDays), label: "ngày hoàn thành" },
          { icon: "📋", value: String(challenge.tasks.length), label: "nhiệm vụ hàng ngày" },
          { icon: "🏷️", value: diffLabel, label: "độ khó" },
        ].map(({ icon, value, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "10px 16px", flex: "0 0 auto" }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <div>
              <div style={{ fontSize: "var(--text-md)", fontWeight: 800, color: "var(--header-primary)", lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pitch content ── */}
      {challenge.pitch ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "20px 24px" }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 800, color: "var(--header-primary)", marginBottom: 12 }}>
            📣 Tại sao tham gia challenge này?
          </h3>
          <div
            className="md-content"
            style={{ color: "var(--text-normal)", lineHeight: 1.75, fontSize: "var(--text-base)" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(challenge.pitch) }}
          />
        </div>
      ) : challenge.description ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "20px 24px" }}>
          <div style={{ color: "var(--text-normal)", lineHeight: 1.75, fontSize: "var(--text-base)" }}>
            {challenge.description}
          </div>
        </div>
      ) : null}

      {/* ── What you'll get ── */}
      {(() => {
        // Admin override (non-empty array) wins; otherwise derive defaults from data.
        type BenefitRow = { icon?: string | null; text: string };
        const customBenefits = challenge.benefits && challenge.benefits.length > 0 ? challenge.benefits : null;
        const items: BenefitRow[] = customBenefits
          ? customBenefits.map((b) => ({ icon: b.icon ?? null, text: b.text }))
          : ([
              { text: `${challenge.tasks.length} nhiệm vụ có cấu trúc rõ ràng — mỗi ngày 1 bước nhỏ, cộng lại = kết quả lớn` },
              { text: "Cộng đồng check-in hàng ngày — không bị bỏ rơi, không mất momentum" },
              { text: "Bảng xếp hạng & streak — gamification giúp bạn duy trì đến ngày cuối" },
              {
                text: challenge.autoStartAfterHours != null
                  ? `Bắt đầu khi sẵn sàng — có ${challenge.autoStartAfterHours}h chuẩn bị trước khi đồng hồ tự chạy`
                  : `Tự chủ tiến độ — bắt đầu ngay khi sẵn sàng, không cần chờ người khác`,
              },
              challenge.products.length > 0
                ? { text: `${challenge.products.length} tài nguyên hỗ trợ từ Marketplace kèm theo` }
                : null,
            ].filter((x): x is BenefitRow => x !== null));
        return (
          <div style={{ background: "var(--bg-card)", border: `1px solid ${accent}33`, borderRadius: 14, padding: "20px 24px" }}>
            <h3 style={{ fontSize: "var(--text-md)", fontWeight: 800, color: "var(--header-primary)", marginBottom: 14 }}>
              🎯 Bạn sẽ có được gì?
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, marginTop: 2, width: 18, height: 18, background: `${accent}22`, border: `1px solid ${accent}55`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: accent, fontSize: 10, fontWeight: 900 }}>{item.icon || "✓"}</span>
                  </span>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", lineHeight: 1.6 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Task preview (first 3, locked) ── */}
      {challenge.tasks.length > 0 && (
        <div>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 800, color: "var(--header-primary)", marginBottom: 10 }}>
            📋 Lộ trình {challenge.requiredDays} ngày
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {challenge.tasks.slice(0, 3).map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${accent}22`, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, color: accent, flexShrink: 0 }}>
                  {t.dayNumber}
                </div>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", fontWeight: 600 }}>
                  {t.title}
                </span>
              </div>
            ))}
            {challenge.tasks.length > 3 && (
              <div style={{ textAlign: "center", padding: "8px", fontSize: "var(--text-xs)", color: "var(--text-muted)", background: "var(--bg-elevated)", borderRadius: 8 }}>
                🔒 + {challenge.tasks.length - 3} ngày nữa — mở khóa sau khi tham gia
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pricing CTA ── */}
      <div style={{ background: `linear-gradient(135deg, ${accent}0f, ${accent}05)`, border: `1px solid ${accent}33`, borderRadius: 16, padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Phí tham gia
            </div>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: priceVnd > 0 ? "var(--success)" : "var(--brand-green)" }}>
              {priceVnd > 0 ? `${priceVnd.toLocaleString("vi-VN")}đ` : "Miễn phí"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            <span>{challenge._count.members} người đã tham gia</span>
          </div>
        </div>
        {joinButton}
        {challenge.autoStartAfterHours != null && (
          <div style={{ marginTop: 10, fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "center" }}>
            Sau khi tham gia bạn có {challenge.autoStartAfterHours} giờ để bấm &quot;Bắt đầu&quot; — quá hạn challenge sẽ tự chạy.
          </div>
        )}
      </div>
    </div>
  );
}
