import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  listNotifications,
  NOTIFICATION_INBOX_LIMIT,
} from "@/lib/services/notification";
import {
  NotificationItem,
  MarkAllReadLink,
} from "@/components/shell/notification-item";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thông báo — focus.camp" };

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?redirectTo=/inbox");

  const { items, unread } = await listNotifications({
    userId: session.user.id,
    limit: NOTIFICATION_INBOX_LIMIT,
  });

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--space-6) var(--space-6) var(--space-10)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "var(--space-4)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: "var(--fw-bold)",
                color: "var(--header-primary)",
                margin: 0,
              }}
            >
              Thông báo
            </h1>
            <div
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              {unread > 0
                ? `${unread} thông báo chưa đọc · ${items.length} gần đây`
                : `${items.length} thông báo · bạn đã xem hết`}
            </div>
          </div>
          {unread > 0 && <MarkAllReadLink />}
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Inbox trống"
            description="Khi ai đó comment, reply hoặc like bài của bạn, nó sẽ xuất hiện ở đây."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                n={{
                  id: n.id,
                  type: n.type,
                  title: n.title,
                  body: n.body,
                  link: n.link,
                  readAt: n.readAt,
                  createdAt: n.createdAt,
                  actor: n.actor,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
