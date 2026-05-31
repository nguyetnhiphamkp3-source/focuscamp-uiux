import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { avatarColorFor as colorFor, nameColorFor as nameColor } from "@/lib/brand";
import { Pin, Users, Bell } from "lucide-react";
import { ChatInput } from "@/components/community/chat-input";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  INFO: "📋 THÔNG TIN",
  PUBLIC: "🟢 PUBLIC",
  VIP: "🟧 VIP",
  RESOURCES: "📚 RESOURCES",
};

function channelPrefix(name: string, type: string): string {
  if (type === "VOICE") return "🔊";
  // keep the first emoji if the channel name starts with one
  const first = [...name][0];
  if (first && first.match(/\p{Extended_Pictographic}/u)) return first;
  return "#";
}

function stripLeadingEmoji(name: string) {
  const first = [...name][0];
  if (first && first.match(/\p{Extended_Pictographic}/u)) {
    return name.slice(first.length);
  }
  return name;
}

function dateKey(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeShort(d: Date) {
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
    include: { channels: { orderBy: [{ category: "asc" }, { position: "asc" }] } },
  });
  if (!community) notFound();

  const channel = community.channels.find((c) => c.slug === channelSlug);
  if (!channel) notFound();

  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: session.user.id,
        communityId: community.id,
      },
    },
  });
  if (!membership) redirect(`/c/${slug}`);

  const messages = await prisma.message.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
    },
  });

  // Group channels by category
  const byCategory: Record<string, typeof community.channels> = {};
  for (const ch of community.channels) {
    const cat = ch.category || "PUBLIC";
    (byCategory[cat] ||= []).push(ch);
  }
  const categoryOrder = ["INFO", "PUBLIC", "VIP", "RESOURCES"];
  const orderedCats = [
    ...categoryOrder.filter((c) => byCategory[c]),
    ...Object.keys(byCategory).filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <div className="chat-module-layout">
      {/* Chat channel list column */}
      <aside className="chat-channels-col">
        <div className="chat-channels-header">Channels</div>
        <div className="chat-channels-list">
          {orderedCats.map((cat) => (
            <div key={cat}>
              <div className="chat-cat-title">
                <span className="cat-arrow">▾</span>
                <span>{CATEGORY_LABEL[cat] || cat}</span>
              </div>
              {byCategory[cat].map((ch) => {
                const active = ch.slug === channelSlug;
                return (
                  <Link
                    key={ch.id}
                    href={`/c/${slug}/chat/${ch.slug}`}
                    className={`chat-channel-item${active ? " active" : ""}`}
                  >
                    <span className="ch-prefix">
                      {channelPrefix(ch.name, ch.type)}
                    </span>
                    <span className="ch-name">{stripLeadingEmoji(ch.name)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Messages column */}
      <div className="chat-messages-col">
        <header
          className="chat-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          {/* Topic only — channel name is shown in the left sidebar already */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {channel.topic || "Không có mô tả kênh"}
          </div>

          {/* Action icons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              flexShrink: 0,
            }}
          >
            <HeaderIconBtn title="Tin nhắn đã ghim"><Pin size={18} /></HeaderIconBtn>
            <HeaderIconBtn title="Thành viên"><Users size={18} /></HeaderIconBtn>
            <HeaderIconBtn title="Thông báo"><Bell size={18} /></HeaderIconBtn>
          </div>
        </header>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 80,
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: "var(--text-3xl)", marginBottom: 8 }}>👋</div>
              <div
                style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: "var(--text-lg)" }}
              >
                Chào mừng đến # {stripLeadingEmoji(channel.name)}
              </div>
              <div style={{ fontSize: "var(--text-base)", marginTop: 4 }}>
                Đây là đầu kênh. Gửi tin nhắn đầu tiên!
              </div>
            </div>
          ) : (
            (() => {
              const blocks: React.ReactNode[] = [];
              let lastDate = "";
              messages.forEach((m) => {
                const dk = dateKey(m.createdAt);
                if (dk !== lastDate) {
                  blocks.push(
                    <div key={`date-${m.id}`} className="date-separator">
                      <div className="date-separator-line"></div>
                      <span className="date-separator-text">{dk}</span>
                      <div className="date-separator-line"></div>
                    </div>
                  );
                  lastDate = dk;
                }
                const displayName = m.user.name || m.user.email || "User";
                const color = nameColor(m.userId);
                const profileHref = `/c/${slug}/profile/${m.user.id}`;
                blocks.push(
                  <div key={m.id} className="message-group">
                    <Link
                      href={profileHref}
                      aria-label={`Xem profile của ${displayName}`}
                    >
                      {m.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.user.image}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            position: "absolute",
                            left: 16,
                            top: 2,
                            cursor: "pointer",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: colorFor(m.userId),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "var(--text-md)",
                            color: "#fff",
                            fontWeight: 600,
                            position: "absolute",
                            left: 16,
                            top: 2,
                            cursor: "pointer",
                          }}
                        >
                          {displayName[0].toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="message-header">
                      <Link
                        href={profileHref}
                        className="message-username"
                        style={{
                          color,
                          textDecoration: "none",
                        }}
                      >
                        {displayName}
                      </Link>
                      <span className="message-timestamp">
                        {formatTimeShort(m.createdAt)}
                      </span>
                    </div>
                    <div className="message-content">{m.content}</div>
                  </div>
                );
              });
              return blocks;
            })()
          )}
        </div>

        <ChatInput
          channelId={channel.id}
          communitySlug={slug}
          channelSlug={channelSlug}
          placeholder={`Message #${stripLeadingEmoji(channel.name)}`}
        />
      </div>
    </div>
  );
}

function HeaderIconBtn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        color: "var(--text-muted)",
        borderRadius: "var(--r-md)",
        cursor: "pointer",
      }}
      className="chat-icon-btn"
    >
      {children}
    </button>
  );
}
