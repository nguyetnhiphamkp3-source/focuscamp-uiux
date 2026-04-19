import Link from "next/link";
import { getActiveChallenge } from "@/lib/services/challenge";
import { computeBossState } from "@/lib/services/community-boss";

const DIFFICULTY_ICON: Record<string, string> = {
  NORMAL: "🛡️",
  HARD: "⚔️",
  CHAOS: "🔥",
};

/**
 * Combined Boss + Challenge card.
 * Boss on top (shared enemy), challenge progress below (your mission).
 * Dark background — stands out on the light sidebar.
 */
export async function BossChallengeCard({
  userId,
  communityId,
  communitySlug,
}: {
  userId: string | null;
  communityId: string;
  communitySlug: string;
}) {
  const [boss, active] = await Promise.all([
    computeBossState(communityId),
    userId ? getActiveChallenge(userId, communityId) : null,
  ]);

  const hpPct = Math.max(0, Math.min(1, boss.hpPct));
  const hpBarColor = "#9b59b6";

  return (
    <div
      style={{
        background: "#1a1a1a",
        borderRadius: "var(--r-md)",
        margin: "var(--space-2) var(--space-3)",
        overflow: "hidden",
      }}
    >
      {/* ===== Boss section ===== */}
      <div
        style={{
          padding: "var(--space-3)",
          textAlign: "center",
        }}
      >
        {/* Boss pixel art — inline via CSS class */}
        <div
          className="wolf-scene boss-scene"
          style={{ margin: "0 auto var(--space-2)" }}
          aria-label={`Boss ${boss.name} — ${boss.currentHp}/${boss.maxHp} HP`}
        >
          <div className="wolf-spark" />
          <div className="wolf-spark" />
          <div className="wolf-spark" />
          <div
            className={`wolf-wrap ${boss.defeated ? "wolf-wrap-defeated" : ""}`}
            style={
              boss.defeated
                ? { animation: "none", left: "50%", transform: "translateX(-50%)" }
                : undefined
            }
          >
            <div className="wolf">
              {WOLF_ROWS.flatMap((row, rowIdx) =>
                row.split("").map((code, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={`px ${CODE_TO_CLASS[code] ?? "px-t"}`}
                  />
                )),
              )}
            </div>
            <div className="wolf-shadow" />
          </div>
        </div>

        {/* Boss name + HP on same row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "#fff" }}>
            {boss.name}
          </span>
          <span style={{ fontSize: 10, color: "#888" }}>
            {boss.defeated ? "💀 Đã hạ" : `HP ${boss.currentHp}/${boss.maxHp}`}
          </span>
        </div>

        {!boss.defeated && (
          <>
            {/* HP bar */}
            <div
              style={{
                height: 6,
                background: "#333",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(hpPct * 100)}%`,
                  height: "100%",
                  background: hpBarColor,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* ===== Divider ===== */}
      <div style={{ height: 1, background: "#333", margin: "0 var(--space-3)" }} />

      {/* ===== Challenge section ===== */}
      <div style={{ padding: "var(--space-3)" }}>
        {!userId ? (
          <>
            <div style={{ fontSize: "var(--text-xs)", color: "#aaa", marginBottom: 6 }}>
              NHIỆM VỤ
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "#ccc", marginBottom: 8 }}>
              Đăng nhập để nhận nhiệm vụ hạ boss.
            </div>
            <Link
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "8px 10px",
                borderRadius: "var(--r-md)",
                background: "var(--brand-green)",
                color: "#fff",
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Đăng nhập
            </Link>
          </>
        ) : !active ? (
          <>
            <div style={{ fontSize: "var(--text-xs)", color: "#aaa", marginBottom: 6 }}>
              NHIỆM VỤ
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "#ccc", marginBottom: 8 }}>
              Chọn nhiệm vụ để bắt đầu hạ boss.
            </div>
            <Link
              href={`/c/${communitySlug}/challenges`}
              style={{
                display: "block",
                textAlign: "center",
                padding: "8px 10px",
                borderRadius: "var(--r-md)",
                background: "var(--brand-green)",
                color: "#fff",
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Chọn nhiệm vụ →
            </Link>
          </>
        ) : (
          <>
            {/* Challenge title */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: "var(--text-sm)", flexShrink: 0 }}>
                {DIFFICULTY_ICON[active.difficulty] || "🛡️"}
              </span>
              <Link
                href={`/c/${communitySlug}/challenges/${active.challengeSlug}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.3,
                  textDecoration: "none",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {active.challengeTitle}
              </Link>
            </div>

            {/* Meta */}
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "#aaa",
                marginBottom: 6,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span>
                Day <strong style={{ color: "#fff" }}>{active.currentDay}</strong>
                /{active.requiredDays}
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>
                🔥 <strong style={{ color: "#fff" }}>{active.streak}</strong>
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 4,
                background: "#333",
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: `${active.progressPct}%`,
                  height: "100%",
                  background: "var(--brand-green)",
                  transition: "width 0.5s ease",
                }}
              />
            </div>

            {/* CTA */}
            <Link
              href={`/c/${communitySlug}/challenges/${active.challengeSlug}`}
              style={{
                display: "block",
                textAlign: "center",
                padding: "8px 10px",
                borderRadius: "var(--r-md)",
                background: active.checkedInToday ? "#333" : "var(--brand-green)",
                color: active.checkedInToday ? "#aaa" : "#fff",
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {active.checkedInToday ? "✓ Đã check-in hôm nay" : "⚔️ Tấn công Boss →"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/* ===== Pixel wolf data — 16x14 side-view wolf ===== */

const CODE_TO_CLASS: Record<string, string> = {
  ".": "px-t",   // transparent
  D: "px-dg",    // dark gray (outline)
  G: "px-g",     // gray (body)
  L: "px-lg",    // light gray (belly)
  W: "px-wh",    // white (teeth, eye highlight)
  K: "px-bl",    // black (nose, claws)
  R: "px-rd",    // red (eye, tongue)
  Y: "px-yw",    // yellow (eye)
};

// Side-view wolf: pointed ears, long snout, bushy tail, legs
// 16 columns x 14 rows
const WOLF_ROWS = [
  "....DDD.....D...",  // tail tip + ear
  "...DGGDD...DGD..",  // tail + ear
  "..DGGGGGDDDGGD..",  // tail connects to body + head
  "..DGGGGGGGGGGD..",  // body + head
  ".DGGGGGGGGRYGD..",  // body + eye (R=red, Y=yellow)
  ".DGGGGGGGGGGKD..",  // body + snout + nose(K)
  ".DLLLGGGGGGWWD..",  // belly(L) + teeth(W)
  ".DGGGGGGGGGRD...",  // body + tongue(R)
  "..DGGGGGGGGD....",  // body
  "..DGDGGDDGD.....",  // legs separating
  "..DGD.GD.DGD....",  // legs
  "..DKD.DK..DKD...",  // paws(K)
  "...D...D...D....",  // ground contact
];
