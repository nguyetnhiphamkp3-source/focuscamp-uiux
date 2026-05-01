"use client";

import { useMemo, useState } from "react";
import type { HeatmapDay } from "@/lib/services/profile";
import type { LevelTier } from "@/lib/community-config";
import { tierForLevel } from "@/lib/community-config";
import { fmtRelativeTime } from "@/lib/brand";

type Tab = "overview" | "activity";
type Period = "all" | "30d" | "7d";

type Membership = {
  tier: string;
  className: string | null;
  xp: number;
  level: number;
  streakDays: number;
};

type Stats = {
  posts: number;
  comments: number;
  checkins: number;
  contributions: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  peakHour: number | null;
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

const LEVEL_COLORS = [
  "var(--bg-modifier-hover)",
  "rgba(27,158,117,0.28)",
  "rgba(27,158,117,0.55)",
  "rgba(27,158,117,0.80)",
  "var(--brand-green)",
];

function levelOf(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function formatBig(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toLocaleString();
}

function hourLabel(h: number): string {
  if (h >= 5 && h < 11) return "sáng";
  if (h >= 11 && h < 13) return "trưa";
  if (h >= 13 && h < 18) return "chiều";
  if (h >= 18 && h < 22) return "tối";
  return "khuya";
}

export function ProfileOverviewCard({
  membership,
  stats,
  levelTiers,
  heatmap,
  recentXp,
}: {
  membership: Membership;
  stats: Stats;
  levelTiers: LevelTier[];
  heatmap: HeatmapDay[];
  recentXp: XpEntry[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("all");

  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : heatmap.length;
  const filteredHeatmap = useMemo(
    () => (heatmap.length > 0 ? heatmap.slice(-periodDays) : []),
    [heatmap, periodDays]
  );
  const periodActiveDays = filteredHeatmap.filter((d) => d.count > 0).length;
  const periodContributions = filteredHeatmap.reduce(
    (sum, d) => sum + d.count,
    0
  );

  const tier = tierForLevel(membership.level, levelTiers);
  const periodLabel =
    period === "all" ? "12 tháng qua" : period === "30d" ? "30 ngày qua" : "7 ngày qua";

  return (
    <div className="pf-overview-card">
      <div className="pf-overview-head">
        <div className="pf-chip-group" role="tablist">
          <button
            type="button"
            className={`pf-chip ${tab === "overview" ? "active" : ""}`}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`pf-chip ${tab === "activity" ? "active" : ""}`}
            onClick={() => setTab("activity")}
          >
            Hoạt động
          </button>
        </div>
        <div className="pf-chip-group">
          {(["all", "30d", "7d"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`pf-chip ${period === p ? "active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <>
          <div className="pf-tile-grid">
            <Tile label="Bài viết" value={stats.posts.toLocaleString()} />
            <Tile label="Bình luận" value={stats.comments.toLocaleString()} />
            <Tile label="Tổng XP" value={formatBig(membership.xp)} />
            <Tile
              label="Ngày active"
              value={periodActiveDays.toLocaleString()}
            />
            <Tile
              label="Streak hiện tại"
              value={`${stats.currentStreak}d`}
            />
            <Tile
              label="Streak dài nhất"
              value={`${stats.longestStreak}d`}
            />
            <Tile
              label="Peak hour"
              value={
                stats.peakHour !== null
                  ? `${stats.peakHour}h`
                  : "—"
              }
              sub={
                stats.peakHour !== null ? hourLabel(stats.peakHour) : undefined
              }
            />
            <Tile
              label="Level"
              value={`Lv ${membership.level}`}
              sub={tier?.name ?? membership.tier}
            />
          </div>

          <CompactHeatmap days={filteredHeatmap} />

          <div className="pf-overview-foot">
            {periodContributions.toLocaleString()} đóng góp trong{" "}
            {periodLabel}
            {periodActiveDays > 0 && periodDays > 0 && (
              <>
                {" "}· {Math.round((periodActiveDays / Math.min(periodDays, filteredHeatmap.length)) * 100)}% ngày active
              </>
            )}
            .
          </div>
        </>
      ) : (
        <div className="pf-activity-stream">
          {recentXp.length === 0 ? (
            <div className="pf-activity-empty">Chưa có hoạt động nào.</div>
          ) : (
            recentXp.map((x) => {
              const positive = x.amount >= 0;
              const label = XP_REASON_LABELS[x.reason] ?? x.reason;
              return (
                <div key={x.id} className="pf-activity-row">
                  <span
                    className="pf-activity-amt"
                    style={{
                      color: positive ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {positive ? "+" : ""}
                    {x.amount} XP
                  </span>
                  <span className="pf-activity-label">{label}</span>
                  <span className="pf-activity-time">
                    {fmtRelativeTime(x.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="pf-tile">
      <div className="pf-tile-label">{label}</div>
      <div className="pf-tile-value">{value}</div>
      {sub && <div className="pf-tile-sub">{sub}</div>}
    </div>
  );
}

function CompactHeatmap({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0) {
    return (
      <div className="pf-mini-heatmap-empty">
        Chưa có dữ liệu hoạt động.
      </div>
    );
  }

  const weeks: (HeatmapDay | null)[][] = [];
  let cur: (HeatmapDay | null)[] = [];
  const firstDay = new Date(days[0].date);
  const pad = firstDay.getDay();
  for (let i = 0; i < pad; i++) cur.push(null);
  for (const d of days) {
    cur.push(d);
    if (cur.length === 7) {
      weeks.push(cur);
      cur = [];
    }
  }
  if (cur.length > 0) {
    while (cur.length < 7) cur.push(null);
    weeks.push(cur);
  }

  return (
    <div className="pf-mini-heatmap">
      <div
        className="pf-mini-heatmap-grid"
        style={{
          gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
          maxWidth: `${weeks.length * 17}px`,
        }}
      >
        {weeks.flatMap((week, colIdx) =>
          week.map((day, rowIdx) => (
            <div
              key={`${colIdx}-${rowIdx}`}
              className="pf-mini-cell"
              title={day ? `${day.date}: ${day.count} hoạt động` : ""}
              style={{
                background: day
                  ? LEVEL_COLORS[levelOf(day.count)]
                  : "transparent",
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
