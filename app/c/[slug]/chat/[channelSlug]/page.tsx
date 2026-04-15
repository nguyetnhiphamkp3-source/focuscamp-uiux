import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#5865F2,#7289DA)",
  "linear-gradient(135deg,#2ecc71,#27ae60)",
  "linear-gradient(135deg,#e67e22,#d35400)",
  "linear-gradient(135deg,#1abc9c,#16a085)",
  "linear-gradient(135deg,#9b59b6,#8e44ad)",
  "linear-gradient(135deg,#e74c3c,#c0392b)",
];
function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
const NAME_COLORS = [
  "#c77a2d",
  "#2d8a4e",
  "#c26a15",
  "#1a8a72",
  "#7b4d9e",
  "#b8455a",
];
function nameColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
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

  async function sendMessage(formData: FormData) {
    "use server";
    const content = (formData.get("content") as string)?.trim();
    if (!content) return;
    const s = await auth();
    if (!s?.user?.id) return;
    await prisma.message.create({
      data: {
        channelId: channel!.id,
        userId: s.user.id,
        content,
      },
    });
    revalidatePath(`/c/${slug}/chat/${channelSlug}`);
  }

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
        <header className="chat-header">
          <div className="chat-header-channel">
            <span className="hash">#</span>
            <span>{stripLeadingEmoji(channel.name)}</span>
            {channel.topic && (
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 400,
                  marginLeft: 10,
                  borderLeft: "1px solid var(--border-subtle)",
                  paddingLeft: 10,
                }}
              >
                {channel.topic}
              </span>
            )}
          </div>
          <div className="chat-header-spacer"></div>
          <div className="header-icon-group">
            <div className="search-box">Search {community.name}</div>
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
                blocks.push(
                  <div key={m.id} className="message-group">
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
                    <div className="message-header">
                      <span className="message-username" style={{ color }}>
                        {displayName}
                      </span>
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

        <div className="chat-input-wrapper" data-view-part="chat">
          <form action={sendMessage}>
            <div className="chat-input">
              <div className="plus-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
              </div>
              <input
                type="text"
                name="content"
                placeholder={`Message #${stripLeadingEmoji(channel.name)}`}
                required
                autoComplete="off"
                style={{
                  flex: 1,
                  background: "transparent",
                  outline: "none",
                  border: "none",
                  fontSize: "var(--text-base)",
                  color: "var(--text-normal)",
                  fontFamily: "inherit",
                }}
              />
              <button type="submit" className="ui-btn ui-btn-primary ui-btn-sm">
                Gửi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
