import { fmtRelativeTime } from "@/lib/brand";
import { tierForLevel } from "@/lib/community-config";
import type { GemsConfig, LevelTier } from "@/lib/community-config";

type Membership = {
  role: string;
  tier: string;
  className: string | null;
  xp: number;
  level: number;
  aip: number;
  gems: number;
  streakDays: number;
  joinedAt: Date;
};

type XpEntry = {
  id: string;
  amount: number;
  reason: string;
  reasonId: string | null;
  createdAt: Date;
};

const XP_REASON_LABELS: Record<string, string> = {
  POST_CREATED: "Đăng bài",
  COMMENT_CREATED: "Bình luận",
  CHECKIN: "Check-in challenge",
  BEST_ANSWER: "Câu trả lời best",
  SUBMISSION_APPROVED: "Submission approved",
  ADMIN_GRANT: "Admin grant",
  ADMIN_PENALTY: "Admin penalty",
};

export function ProfileStats({
  membership,
  stats,
  currency,
  levelTiers,
  recentXp,
}: {
  membership: Membership;
  stats: {
    posts: number;
    comments: number;
    checkins: number;
    contributions: number;
    activeDays: number;
    currentStreak: number;
    longestStreak: number;
    peakHour: number | null;
  };
  currency: GemsConfig;
  levelTiers: LevelTier[];
  recentXp: XpEntry[];
}) {
  const tier = tierForLevel(membership.level, levelTiers);

  return (
    <>
      <div className="pf-level-card">
        <div className="pf-level-badge">{membership.level}</div>
        <div className="pf-level-info">
          <div className="pf-level-row">
            <span className="pf-level-title">
              Level {membership.level}
              {tier ? ` — ${tier.name}` : ` — ${membership.tier}`}
            </span>
          </div>
          <div className="pf-level-bar">
            <div
              className="pf-level-fill"
              style={{ width: `${Math.min(100, membership.xp % 100)}%` }}
            ></div>
          </div>
          <div className="pf-level-hint">
            {membership.xp} XP · còn {100 - (membership.xp % 100)} XP để lên
            level tiếp theo
          </div>
        </div>
      </div>

      <div className="pf-stats-grid">
        <Stat
          label="⭐ Total XP"
          value={membership.xp.toLocaleString()}
          sub="Điểm kinh nghiệm"
        />
        <Stat
          label={`${currency.currencyIcon} ${currency.currencyName}`}
          value={membership.aip.toLocaleString()}
          sub="Đồng điểm chính"
        />
        {currency.gemsName && (
          <Stat
            label={`${currency.gemsIcon ?? "💎"} ${currency.gemsName}`}
            value={membership.gems.toLocaleString()}
            sub="Đồng điểm phụ"
          />
        )}
        <Stat
          label="🔥 Streak"
          value={membership.streakDays.toString()}
          sub="ngày liên tục"
        />
        <Stat
          label="🎯 Tổng hoạt động"
          value={stats.contributions.toLocaleString()}
          sub={`${stats.posts}P · ${stats.comments}C · ${stats.checkins}✓`}
        />
        <Stat
          label="📅 Ngày active"
          value={stats.activeDays.toString()}
          sub="trong 12 tháng"
        />
        <Stat
          label="🔥 Streak hiện tại"
          value={`${stats.currentStreak}d`}
          sub={
            stats.currentStreak > 0 ? "ngày liên tục" : "bắt đầu chuỗi mới"
          }
        />
        <Stat
          label="🏆 Streak dài nhất"
          value={`${stats.longestStreak}d`}
          sub="kỷ lục trong 12 tháng"
        />
        <Stat
          label="⏰ Peak hour"
          value={stats.peakHour !== null ? `${stats.peakHour}:00` : "—"}
          sub={
            stats.peakHour !== null
              ? `${hourLabel(stats.peakHour)}`
              : "chưa có dữ liệu"
          }
        />
        <Stat label="📝 Posts" value={stats.posts.toString()} sub="đã đăng" />
        <Stat
          label="💬 Comments"
          value={stats.comments.toString()}
          sub="đã bình luận"
        />
        <Stat
          label="✓ Check-ins"
          value={stats.checkins.toString()}
          sub="challenges"
        />
      </div>

      {recentXp.length > 0 && (
        <div className="pf-section" style={{ marginTop: 20 }}>
          <h3>XP log gần đây</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentXp.map((x) => {
              const positive = x.amount >= 0;
              const label = XP_REASON_LABELS[x.reason] ?? x.reason;
              return (
                <div
                  key={x.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "6px 10px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <span
                    style={{
                      color: positive ? "var(--success)" : "var(--danger)",
                      fontWeight: 700,
                      minWidth: 52,
                    }}
                  >
                    {positive ? "+" : ""}
                    {x.amount} XP
                  </span>
                  <span style={{ flex: 1, color: "var(--text-normal)" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    {fmtRelativeTime(x.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="pf-stat">
      <div className="pf-stat-label">{label}</div>
      <div className="pf-stat-value">{value}</div>
      <div className="pf-stat-sub">{sub}</div>
    </div>
  );
}

/** Human label for hour of day — "sáng", "chiều", etc. */
function hourLabel(h: number): string {
  if (h >= 5 && h < 11) return "sáng";
  if (h >= 11 && h < 13) return "trưa";
  if (h >= 13 && h < 18) return "chiều";
  if (h >= 18 && h < 22) return "tối";
  return "khuya";
}
