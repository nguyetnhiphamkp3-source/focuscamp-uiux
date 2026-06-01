import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cài đặt tài khoản — focus.camp",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?redirectTo=/settings");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      handle: true,
      image: true,
      telegramUserId: true,
      telegramUsername: true,
    },
  });

  if (!user) redirect("/");

  const profileHref = `/u/${encodeURIComponent(user.handle ?? user.id)}`;

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <header className="view-header">
        <span className="view-title">Cài đặt tài khoản</span>
        <span className="view-subtitle">Profile, thông báo và tích hợp cá nhân</span>
      </header>

      <div className="settings-page-scroll account-settings-scroll">
        <div className="settings-page-inner settings-page-inner-account">
        <section
          className="ui-card account-settings-profile-card"
          style={{
            padding: "var(--space-5)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--brand-green)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(user.name || user.email || "U")[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--header-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name || user.email}
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
              }}
            >
              {user.handle ? `@${user.handle}` : user.email}
            </div>
          </div>
          <Link href={profileHref} className="ui-btn ui-btn-secondary">
            Xem profile
          </Link>
        </section>

        <div
          className="account-settings-card-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          <SettingsCard
            href={profileHref}
            title="Profile"
            description="Trang hồ sơ công khai, cộng đồng đã tham gia và social graph."
          />
          <SettingsCard
            href="/inbox"
            title="Thông báo"
            description="Comment, reply, challenge review và các cập nhật liên quan."
          />
          <SettingsCard
            href="/settings/integrations"
            title="Tích hợp"
            description={
              user.telegramUserId
                ? `Telegram đã liên kết${user.telegramUsername ? `: @${user.telegramUsername}` : ""}.`
                : "Liên kết Telegram để dùng bot và AI Agent ngoài web."
            }
          />
        </div>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="ui-card"
      style={{
        padding: "var(--space-4)",
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div
        style={{
          fontSize: "var(--text-md)",
          fontWeight: 700,
          color: "var(--header-primary)",
          marginBottom: "var(--space-2)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "var(--text-sm)",
          lineHeight: 1.5,
          color: "var(--text-muted)",
        }}
      >
        {description}
      </div>
    </Link>
  );
}
