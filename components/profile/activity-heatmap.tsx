/**
 * GitHub-style activity heatmap — 52 columns (weeks) × 7 rows (days).
 * One cell per day, colored by count. Pure server component; no JS.
 *
 * Data format matches profile.ts `HeatmapDay[]` — one entry per day for the
 * past 365 days, oldest first.
 */
import type { HeatmapDay } from "@/lib/services/profile";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Map a count to a shade level 0-4 for coloring intensity. */
function level(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const LEVEL_COLORS = [
  "var(--bg-modifier-hover)", // 0 — no activity
  "rgba(27,158,117,0.28)", // 1
  "rgba(27,158,117,0.55)", // 2
  "rgba(27,158,117,0.80)", // 3
  "var(--brand-green)", // 4 — maxed
];

export function ActivityHeatmap({
  days,
  totalContributions,
}: {
  days: HeatmapDay[];
  totalContributions: number;
}) {
  // Group into weeks (Sun–Sat). Pad the first week with empty cells so
  // weekday alignment is consistent across screens.
  const weeks: (HeatmapDay | null)[][] = [];
  let cur: (HeatmapDay | null)[] = [];
  if (days.length > 0) {
    const firstDay = new Date(days[0].date);
    const pad = firstDay.getDay(); // 0 Sun … 6 Sat
    for (let i = 0; i < pad; i++) cur.push(null);
  }
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

  // Month labels along the top — one per month transition
  const monthTicks: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, colIdx) => {
    const firstRealDay = week.find((d) => d);
    if (!firstRealDay) return;
    const m = new Date(firstRealDay.date).getMonth();
    if (m !== lastMonth) {
      monthTicks.push({ col: colIdx, label: MONTH_LABELS[m] });
      lastMonth = m;
    }
  });

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-lg)",
        padding: "var(--space-4) var(--space-5)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <h3
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--header-primary)",
            margin: 0,
          }}
        >
          {totalContributions.toLocaleString()} hoạt động trong 12 tháng
        </h3>
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          <span>Ít</span>
          {LEVEL_COLORS.map((c, i) => (
            <span
              key={i}
              style={{
                width: 10,
                height: 10,
                background: c,
                borderRadius: 2,
                display: "inline-block",
              }}
            />
          ))}
          <span>Nhiều</span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "flex-start",
            gap: 6,
          }}
        >
          {/* Weekday labels column — aligned with grid rows, offset by month header */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: "repeat(7, 12px)",
              gap: 3,
              marginTop: 14 + 3, // month labels row height + gap
              fontSize: 10,
              color: "var(--text-muted)",
            }}
          >
            {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
              <span
                key={i}
                style={{
                  height: 12,
                  lineHeight: "12px",
                  paddingRight: 2,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Right side: month row + grid stacked */}
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {/* Month labels row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${weeks.length}, 12px)`,
                gap: 3,
                height: 14,
                fontSize: 10,
                color: "var(--text-muted)",
                position: "relative",
              }}
            >
              {monthTicks.map((t) => (
                <span
                  key={t.col}
                  style={{
                    gridColumn: t.col + 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${weeks.length}, 12px)`,
                gridTemplateRows: "repeat(7, 12px)",
                gridAutoFlow: "column",
                gap: 3,
              }}
            >
              {weeks.flatMap((week, colIdx) =>
                week.map((day, rowIdx) =>
                  day ? (
                    <div
                      key={`${colIdx}-${rowIdx}`}
                      title={`${day.date}: ${day.count} hoạt động`}
                      style={{
                        width: 12,
                        height: 12,
                        background: LEVEL_COLORS[level(day.count)],
                        borderRadius: 2,
                      }}
                    />
                  ) : (
                    <div
                      key={`${colIdx}-${rowIdx}-empty`}
                      style={{ width: 12, height: 12 }}
                    />
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
