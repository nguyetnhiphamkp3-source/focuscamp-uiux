import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CompletedCelebrationPage({
  params,
}: {
  params: Promise<{ slug: string; challengeSlug: string }>;
}) {
  const { slug, challengeSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const challenge = await prisma.challenge.findFirst({
    where: { community: { slug }, slug: challengeSlug },
    select: { id: true, title: true, difficulty: true, requiredDays: true },
  });
  if (!challenge) notFound();

  const member = await prisma.challengeMember.findFirst({
    where: {
      userId: session.user.id,
      challengeId: challenge.id,
    },
    select: { status: true, completedAt: true },
  });

  const xpEarned = challenge.requiredDays * 5;

  return (
    <>
      <header className="view-header">
        <span className="view-title">🏆 Hoàn thành!</span>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ConfettiLayer />
        <div
          style={{
            position: "relative",
            maxWidth: 520,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 96,
              marginBottom: "var(--space-4)",
              filter: "drop-shadow(0 4px 12px rgba(240,178,50,0.5))",
            }}
          >
            🏆
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: "var(--text-3xl)",
              fontStyle: "italic",
              fontWeight: "var(--fw-regular)",
              marginBottom: "var(--space-3)",
              color: "var(--text-heading)",
            }}
          >
            Bạn đã hoàn thành
          </h1>
          <div
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "var(--fw-extrabold)",
              marginBottom: "var(--space-5)",
              color: "var(--brand-green)",
            }}
          >
            {challenge.title}
          </div>

          <div
            className="ui-card"
            style={{
              marginBottom: "var(--space-5)",
              display: "flex",
              justifyContent: "space-around",
              gap: "var(--space-3)",
            }}
          >
            <Stat label="Ngày chinh phục" value={String(challenge.requiredDays)} />
            <Stat label="XP earned" value={`+${xpEarned}`} accent />
            <Stat
              label="Hoàn thành"
              value={
                member?.completedAt
                  ? member.completedAt.toLocaleDateString("vi-VN")
                  : "—"
              }
            />
          </div>

          <p
            style={{
              color: "var(--text-muted)",
              lineHeight: "var(--lh-relaxed)",
              marginBottom: "var(--space-6)",
            }}
          >
            Mỗi challenge là 1 hạt nhỏ trong ngọn lửa.
            <br />
            Tiếp tục hành trình → chọn thử thách tiếp theo.
          </p>

          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/c/${slug}/challenges?tab=explore`}
              className="ui-btn ui-btn-primary ui-btn-lg"
            >
              Chọn challenge tiếp theo
            </Link>
            <Link
              href={`/c/${slug}/challenges?tab=completed`}
              className="ui-btn ui-btn-secondary"
            >
              Xem thành tựu
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--fw-extrabold)",
          color: accent ? "var(--brand-green)" : "var(--text-heading)",
          lineHeight: "var(--lh-tight)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginTop: "var(--space-1)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/** Pure CSS confetti — 30 dots animated */
function ConfettiLayer() {
  const colors = ["#ff7043", "#1B9E75", "#f0b132", "#eb459e", "#5865F2"];
  const dots = Array.from({ length: 36 }).map((_, i) => ({
    id: i,
    left: (i * 97) % 100,
    delay: (i * 0.17) % 3,
    color: colors[i % colors.length],
    size: 6 + ((i * 3) % 6),
  }));
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {dots.map((d) => (
        <span
          key={d.id}
          style={{
            position: "absolute",
            top: -20,
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            borderRadius: d.id % 2 === 0 ? "50%" : 2,
            background: d.color,
            animation: `confetti-fall 3s ${d.delay}s linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
