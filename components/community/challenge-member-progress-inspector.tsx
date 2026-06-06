import Link from "next/link";
import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { avatarColorFor, initials } from "@/lib/brand";
import { parseCheckinHistory } from "@/lib/checkin-history";
import type {
  ChallengeMemberProgressDetail,
  ChallengeMemberProgressRow,
  ChallengeProgressTimelineState,
} from "@/lib/services/challenge-member-progress";
import { LinkifiedText } from "@/components/shared/linkified-text";
import { SubmissionHistory } from "@/components/community/submission-history";
import { SubmissionImageCarousel } from "@/components/community/submission-image-carousel";
import { ChallengeMemberProgressQueryButton } from "@/components/community/challenge-member-progress-query-button";

export function ChallengeMemberProgressInspector({
  communitySlug,
  roster,
  selectedMemberId,
  detail,
}: {
  communitySlug: string;
  roster: ChallengeMemberProgressRow[];
  selectedMemberId: string | null;
  detail: ChallengeMemberProgressDetail | null;
}) {
  if (roster.length === 0) return null;
  const selectedName = detail ? displayName(detail.user) : null;

  return (
    <section style={{ marginTop: "var(--space-8)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          marginBottom: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "var(--text-xl)" }}>
            Tien do thanh vien
          </h2>
          <p
            style={{
              margin: "var(--space-1) 0 0",
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
            }}
          >
            Chon mot thanh vien de xem timeline va bang chung chi tiet.
          </p>
        </div>
      </div>

      <details
        style={pickerShellStyle}
      >
        <summary style={pickerSummaryStyle}>
          <span style={{ color: "var(--text-heading)", fontWeight: "var(--fw-bold)" }}>
            {selectedName ? `Dang xem: ${selectedName}` : "Chon thanh vien"}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
            {roster.length} thanh vien
          </span>
        </summary>
        <div style={pickerListStyle}>
          {roster.map((row) => (
            <MemberPickerRow
              key={row.memberId}
              row={row}
              communitySlug={communitySlug}
              selected={row.userId === selectedMemberId}
            />
          ))}
        </div>
      </details>

      {selectedMemberId && !detail && (
        <div
          style={{
            marginTop: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            border: "1px solid var(--warning)",
            borderRadius: "var(--r-md)",
            background: "var(--warning-soft)",
            color: "var(--text-normal)",
            fontSize: "var(--text-sm)",
          }}
        >
          Khong tim thay member trong challenge nay.
        </div>
      )}

      {detail && (
        <MemberProgressDetailPanel
          detail={detail}
          communitySlug={communitySlug}
        />
      )}
    </section>
  );
}

function MemberPickerRow({
  row,
  communitySlug,
  selected,
}: {
  row: ChallengeMemberProgressRow;
  communitySlug: string;
  selected: boolean;
}) {
  const name = displayName(row.user);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        padding: "var(--space-3)",
        borderTop: "1px solid var(--border-subtle)",
        background: selected ? "rgba(27,158,117,0.08)" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}>
        <MemberAvatar userId={row.user.id} name={name} image={row.user.image} size={34} />
        <div style={{ minWidth: 0 }}>
          <Link
            href={`/c/${communitySlug}/profile/${row.user.id}`}
            style={{
              color: "var(--text-heading)",
              fontWeight: "var(--fw-bold)",
              textDecoration: "none",
              overflowWrap: "anywhere",
            }}
          >
            {name}
          </Link>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap",
              marginTop: 2,
              color: "var(--text-muted)",
              fontSize: "var(--text-xs)",
            }}
          >
            {row.user.handle && <span>@{row.user.handle}</span>}
            <span>
              {row.currentDay > 0 ? `Day ${row.currentDay}` : "Chua bat dau"} · {row.approvedCount}/{row.totalTasks}
            </span>
          </div>
        </div>
      </div>
      <ChallengeMemberProgressQueryButton
        memberId={row.userId}
        selected={selected}
        ariaLabel={`Xem tien do ${name}`}
      >
        Xem
      </ChallengeMemberProgressQueryButton>
    </div>
  );
}

function MemberProgressDetailPanel({
  detail,
  communitySlug,
}: {
  detail: ChallengeMemberProgressDetail;
  communitySlug: string;
}) {
  const name = displayName(detail.user);
  return (
    <div
      style={{
        marginTop: "var(--space-4)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
          <MemberAvatar userId={detail.user.id} name={name} image={detail.user.image} size={42} />
          <div style={{ minWidth: 0 }}>
            <Link
              href={`/c/${communitySlug}/profile/${detail.user.id}`}
              style={{
                color: "var(--text-heading)",
                fontSize: "var(--text-lg)",
                fontWeight: "var(--fw-bold)",
                textDecoration: "none",
                overflowWrap: "anywhere",
              }}
            >
              {name}
            </Link>
            <div
              style={{
                marginTop: "var(--space-1)",
                display: "flex",
                gap: "var(--space-2)",
                flexWrap: "wrap",
                color: "var(--text-muted)",
                fontSize: "var(--text-xs)",
              }}
            >
              <span>Joined {formatDate(detail.joinedAt)}</span>
              {detail.effectiveStartsAt && <span>Start {formatDate(detail.effectiveStartsAt)}</span>}
              {detail.completedAt && <span>Completed {formatDate(detail.completedAt)}</span>}
            </div>
          </div>
        </div>
        <ChallengeMemberProgressQueryButton
          memberId={null}
          variant="close"
          ariaLabel="Dong chi tiet thanh vien"
        >
          <X size={16} aria-hidden="true" />
        </ChallengeMemberProgressQueryButton>
      </div>

      <div style={{ padding: "var(--space-4)" }}>
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            marginBottom: "var(--space-5)",
          }}
        >
          <SummaryMetric label="Current" value={detail.currentDay > 0 ? `Day ${detail.currentDay}` : "Chua start"} />
          <SummaryMetric label="Approved" value={`${detail.approvedCount}/${detail.totalTasks}`} />
          <SummaryMetric label="Cho duyet" value={String(detail.pendingCount)} />
          <SummaryMetric label="Bi tu choi" value={String(detail.rejectedCount)} />
          <SummaryMetric label="Tre" value={String(detail.lateCount)} />
          <SummaryMetric label="Thieu" value={String(detail.missingCount)} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {detail.tasks.map((task) => (
            <TimelineTask key={task.taskId} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineTask({
  task,
}: {
  task: ChallengeMemberProgressDetail["tasks"][number];
}) {
  const meta = stateMeta(task.state);
  const history = parseCheckinHistory(task.checkin?.reviewHistory);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px minmax(0, 1fr)",
        gap: "var(--space-3)",
        padding: "var(--space-3)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-secondary)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--r-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: meta.bg,
          color: meta.color,
          fontSize: "var(--text-sm)",
          fontWeight: "var(--fw-extrabold)",
        }}
      >
        {task.dayNumber}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-2)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "var(--text-heading)",
                fontWeight: "var(--fw-bold)",
                fontSize: "var(--text-sm)",
                overflowWrap: "anywhere",
              }}
            >
              Day {task.dayNumber}: {task.title}
            </div>
            {task.label && (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                {task.label}
              </div>
            )}
          </div>
          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
        </div>

        <div
          style={{
            marginTop: "var(--space-2)",
            display: "flex",
            gap: "var(--space-3)",
            flexWrap: "wrap",
            color: "var(--text-muted)",
            fontSize: "var(--text-xs)",
          }}
        >
          {task.deadlineAt && <span>Deadline {formatDateTime(task.deadlineAt)}</span>}
          {task.checkin && <span>Nop {formatDateTime(task.checkin.submittedAt)}</span>}
          {task.checkin?.reviewedAt && <span>Review {formatDateTime(task.checkin.reviewedAt)}</span>}
        </div>

        {task.checkin && (
          <div
            style={{
              marginTop: "var(--space-3)",
              padding: "var(--space-3)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
            }}
          >
            {task.checkin.reviewNote && (
              <div
                style={{
                  marginBottom: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--r-sm)",
                  background:
                    task.checkin.status === "REJECTED"
                      ? "rgba(218,55,60,0.06)"
                      : "rgba(36,128,70,0.06)",
                  border: `1px solid ${
                    task.checkin.status === "REJECTED"
                      ? "rgba(218,55,60,0.2)"
                      : "rgba(36,128,70,0.2)"
                  }`,
                  fontSize: "var(--text-xs)",
                  color: "var(--text-normal)",
                }}
              >
                <strong>{task.checkin.reviewedBy?.name ?? "Reviewer"}:</strong>{" "}
                {task.checkin.reviewNote}
              </div>
            )}
            <div
              style={{
                color: "var(--text-normal)",
                fontSize: "var(--text-sm)",
                lineHeight: "var(--lh-relaxed)",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              <LinkifiedText>{task.checkin.content}</LinkifiedText>
            </div>
            {task.checkin.linkUrl && (
              <a
                href={task.checkin.linkUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: "var(--space-2)",
                  color: "var(--info)",
                  fontSize: "var(--text-xs)",
                  overflowWrap: "anywhere",
                  maxWidth: "100%",
                }}
              >
                {task.checkin.linkUrl}
              </a>
            )}
            <SubmissionImageCarousel images={task.checkin.imageUrls} alt="Bang chung" compact />
            <SubmissionHistory entries={history} />
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "var(--space-3)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-secondary)",
        minWidth: 0,
      }}
    >
      <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", marginBottom: "var(--space-1)" }}>
        {label}
      </div>
      <div
        style={{
          color: "var(--text-heading)",
          fontSize: "var(--text-lg)",
          fontWeight: "var(--fw-extrabold)",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MemberAvatar({
  userId,
  name,
  image,
  size,
}: {
  userId: string;
  name: string;
  image: string | null;
  size: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarColorFor(userId),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "var(--fw-bold)",
        fontSize: size > 36 ? "var(--text-md)" : "var(--text-xs)",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "warning" | "danger" | "info" | "muted";
}) {
  const colors = {
    success: { color: "var(--success)", bg: "rgba(36,128,70,0.12)" },
    warning: { color: "var(--warning)", bg: "rgba(240,178,50,0.14)" },
    danger: { color: "var(--danger)", bg: "rgba(218,55,60,0.1)" },
    info: { color: "var(--info)", bg: "rgba(0,168,252,0.1)" },
    muted: { color: "var(--text-muted)", bg: "var(--bg-chat)" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 22,
        padding: "0 var(--space-2)",
        borderRadius: "var(--r-sm)",
        background: colors.bg,
        color: colors.color,
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-bold)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function stateMeta(state: ChallengeProgressTimelineState): {
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "muted";
  color: string;
  bg: string;
} {
  switch (state) {
    case "APPROVED_ON_TIME":
      return { label: "Dung han", tone: "success", color: "var(--success)", bg: "rgba(36,128,70,0.12)" };
    case "APPROVED_LATE":
      return { label: "Tre", tone: "warning", color: "var(--warning)", bg: "rgba(240,178,50,0.14)" };
    case "PENDING":
      return { label: "Cho duyet", tone: "warning", color: "var(--warning)", bg: "rgba(240,178,50,0.14)" };
    case "REJECTED":
      return { label: "Bi tu choi", tone: "danger", color: "var(--danger)", bg: "rgba(218,55,60,0.1)" };
    case "MISSING":
      return { label: "Thieu", tone: "danger", color: "var(--danger)", bg: "rgba(218,55,60,0.1)" };
    case "CURRENT":
      return { label: "Dang lam", tone: "info", color: "var(--info)", bg: "rgba(0,168,252,0.1)" };
    case "LOCKED":
    default:
      return { label: "Chua mo", tone: "muted", color: "var(--text-muted)", bg: "var(--bg-chat)" };
  }
}

function displayName(user: ChallengeMemberProgressRow["user"]): string {
  return user.name || user.email?.split("@")[0] || "Member";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const pickerShellStyle: CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-card)",
  overflow: "hidden",
};

const pickerSummaryStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-4)",
  cursor: "pointer",
  listStyle: "none",
};

const pickerListStyle: CSSProperties = {
  maxHeight: 360,
  overflowY: "auto",
  borderTop: "1px solid var(--border-subtle)",
};
