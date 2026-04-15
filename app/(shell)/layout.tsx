import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ServerList } from "@/components/shell/server-list";
import { UserPanel } from "@/components/shell/user-panel";
import { HomeSidebar } from "@/components/shell/home-sidebar";

export const dynamic = "force-dynamic";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let myCommunities: { id: string; slug: string; name: string }[] = [];
  if (session?.user?.id) {
    const mems = await prisma.membership.findMany({
      where: { userId: session.user.id },
      include: { community: { select: { id: true, slug: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    });
    myCommunities = mems.map((m) => m.community);
  }

  return (
    <div className="community-shell">
      <div className="left-section">
        <div className="left-section-top">
          <ServerList communities={myCommunities} />
          <HomeSidebar />
        </div>
        <UserPanel user={session?.user} />
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}
