import Link from "next/link";
import { getActiveChallenge } from "@/lib/services/challenge";

const DIFFICULTY_ICON: Record<string, string> = {
  NORMAL: "🛡️",
  HARD: "⚔️",
  CHAOS: "🔥",
};

export async function ActiveChallengeWidget({
  userId,
  communityId,
  communitySlug,
}: {
  userId: string | null;
  communityId: string;
  communitySlug: string;
}) {
  if (!userId) {
    return (
      <WidgetShell>
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginBottom: "var(--space-2)",
          }}
        >
          THỬ THÁCH CỦA BẠN
        </div>
        <div
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-normal)",
            marginBottom: "var(--space-3)",
            lineHeight: "var(--lh-normal)",
          }}
        >
          Đăng nhập để bắt đầu chinh phục.
        </div>
        <Link
          href="/login"
          style={{
            display: "block",
            textAlign: "center",
            padding: "6px 10px",
            borderRadius: "var(--r-md)",
            background: "var(--brand-green)",
            color: "#fff",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-bold)",
            textDecoration: "none",
          }}
        >
          Đăng nhập
        </Link>
      </WidgetShell>
    );
  }

  const active = await getActiveChallenge(userId, communityId);

  if (!active) {
    return (
      <WidgetShell>
        <div
          style={{
            fontSize: "var(--text-xs)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: "var(--fw-semibold)",
            marginBottom: "var(--space-2)",
          }}
        >
          🎯 Chưa có thử thách
        </div>
        <div
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-normal)",
            marginBottom: "var(--space-3)",
            lineHeight: "var(--lh-normal)",
          }}
        >
          Chọn thử thách đầu tiên để bắt đầu hành trình.
        </div>
        <Link
          href={`/c/${communitySlug}/challenges`}
          style={{
            display: "block",
            textAlign: "center",
            padding: "6px 10px",
            borderRadius: "var(--r-md)",
            background: "var(--brand-green)",
            color: "#fff",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-bold)",
            textDecoration: "none",
          }}
        >
          Khám phá →
        </Link>
      </WidgetShell>
    );
  }

  const diff = DIFFICULTY_ICON[active.difficulty] || "🛡️";

  return (
    <WidgetShell>
      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-1)",
          marginBottom: "var(--space-2)",
        }}
      >
        <span style={{ fontSize: "var(--text-sm)", flexShrink: 0 }}>{diff}</span>
        <Link
          href={`/c/${communitySlug}/challenges/${active.challengeSlug}`}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "var(--text-sm)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-heading)",
            lineHeight: "var(--lh-tight)",
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
          color: "var(--text-muted)",
          marginBottom: "var(--space-2)",
          display: "flex",
          gap: "var(--space-2)",
          alignItems: "center",
        }}
      >
        <span>
          Day{" "}
          <strong style={{ color: "var(--text-heading)" }}>
            {active.currentDay}
          </strong>
          /{active.requiredDays}
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>
          🔥{" "}
          <strong style={{ color: "var(--text-heading)" }}>
            {active.streak}
          </strong>
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "var(--bg-elevated)",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: "var(--space-3)",
        }}
      >
        <div
          style={{
            width: `${active.progressPct}%`,
            height: "100%",
            background: "var(--brand-green)",
            transition: "width var(--dur-slow) var(--ease)",
          }}
        />
      </div>

      {/* CTA */}
      <Link
        href={`/c/${communitySlug}/challenges/${active.challengeSlug}`}
        style={{
          display: "block",
          textAlign: "center",
          padding: "6px 10px",
          borderRadius: "var(--r-md)",
          background: active.checkedInToday
            ? "var(--bg-elevated)"
            : "var(--brand-green)",
          color: active.checkedInToday ? "var(--text-muted)" : "#fff",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-bold)",
          textDecoration: "none",
          border: active.checkedInToday
            ? "1px solid var(--border-subtle)"
            : "none",
        }}
      >
        {active.checkedInToday
          ? "✓ Đã check-in hôm nay"
          : "📝 Task hôm nay →"}
      </Link>
    </WidgetShell>
  );
}

function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "var(--space-3)",
        background: "var(--bg-elevated)",
        borderRadius: "var(--r-md)",
        margin: "var(--space-2) var(--space-3)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {children}
    </div>
  );
}
