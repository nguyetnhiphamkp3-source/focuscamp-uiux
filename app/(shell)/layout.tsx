import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ServerList } from "@/components/shell/server-list";
import { UserPanel } from "@/components/shell/user-panel";
import { HomeSidebar } from "@/components/shell/home-sidebar";
import { KeyboardShortcuts } from "@/components/shell/keyboard-shortcuts";
import { ShortcutSheet } from "@/components/shell/shortcut-sheet";
import { MobileMenuToggle } from "@/components/shell/mobile-menu-toggle";
import { unreadCount } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let myCommunities: { id: string; slug: string; name: string; iconUrl: string | null }[] = [];
  let notifUnread = 0;
  let freshUser: { id: string; name: string | null; email: string | null; image: string | null } | null = null;
  if (session?.user?.id) {
    const [mems, n, u] = await Promise.all([
      prisma.membership.findMany({
        where: { userId: session.user.id },
        include: { community: { select: { id: true, slug: true, name: true, iconUrl: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      unreadCount(session.user.id),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, image: true },
      }),
    ]);
    myCommunities = mems.map((m) => m.community);
    notifUnread = n;
    freshUser = u;
  }

  return (
    <div className="community-shell">
      <MobileMenuToggle />
      <div className="left-section">
        <div className="left-section-top">
          <ServerList communities={myCommunities} />
          <HomeSidebar notifUnread={notifUnread} />
        </div>
        <UserPanel
          user={freshUser ?? session?.user}
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
