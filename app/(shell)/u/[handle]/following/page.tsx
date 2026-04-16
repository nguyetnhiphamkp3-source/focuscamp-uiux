import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserListRow } from "@/components/profile/user-list-row";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const clean = decodeURIComponent(handle).replace(/^@/, "");
  const user = await prisma.user.findFirst({
    where: { OR: [{ handle: clean }, { id: clean }] },
    select: {
      id: true,
      name: true,
      handle: true,
      follows: {
        include: {
          followee: {
            select: {
              id: true,
              name: true,
              handle: true,
              image: true,
              bio: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!user) notFound();

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--space-6)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href={`/u/${user.handle ?? user.id}`}
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--interactive-normal)",
            textDecoration: "none",
          }}
        >
          ← Về profile
        </Link>
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 700,
            marginTop: 8,
            color: "var(--header-primary)",
          }}
        >
          {user.name ?? handle} đang follow ({user.follows.length})
        </h1>
        <div style={{ marginTop: 16 }}>
          {user.follows.length === 0 ? (
            <EmptyState
              icon="👥"
              title="Chưa follow ai"
              description="Vào profile người khác và bấm Follow để xây dựng feed Following."
            />
          ) : (
            user.follows.map((f) => (
              <UserListRow key={f.followee.id} user={f.followee} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
