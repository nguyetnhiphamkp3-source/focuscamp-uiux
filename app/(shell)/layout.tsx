import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ServerList } from "@/components/shell/server-list";
import { UserPanel } from "@/components/shell/user-panel";
import { HomeSidebar } from "@/components/shell/home-sidebar";
import { KeyboardShortcuts } from "@/components/shell/keyboard-shortcuts";
import { ShortcutSheet } from "@/components/shell/shortcut-sheet";
import { unreadCount } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let myCommunities: { id: string; slug: string; name: string }[] = [];
  let notifUnread = 0;
  if (session?.user?.id) {
    const [mems, n] = await Promise.all([
      prisma.membership.findMany({
        where: { userId: session.user.id },
        include: { community: { select: { id: true, slug: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      unreadCount(session.user.id),
    ]);
    myCommunities = mems.map((m) => m.community);
    notifUnread = n;
  }

  return (
    <div className="community-shell">
      <div className="left-section">
        <div className="left-section-top">
          <ServerList communities={myCommunities} />
          <HomeSidebar notifUnread={notifUnread} />
        </div>
        <UserPanel
          user={session?.user}
          profileHref={
            session?.user?.id ? `/u/${session.user.id}` : undefined
          }
        />
      </div>
      <main className="main-content">{children}</main>
      <KeyboardShortcuts />
      <ShortcutSheet />
    </div>
  );
}
