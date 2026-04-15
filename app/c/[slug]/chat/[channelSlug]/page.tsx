import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
  });
  if (!community) notFound();

  const channel = await prisma.channel.findFirst({
    where: { communityId: community.id, slug: channelSlug },
  });
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
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
    },
  });

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
    <>
      <header
        style={{
          height: 52,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "var(--text-heading)",
          }}
        >
          # {channel.name}
        </div>
        {channel.topic && (
          <div
            style={{
              marginLeft: 12,
              paddingLeft: 12,
              fontSize: 13,
              color: "var(--text-muted)",
              borderLeft: "1px solid var(--border-subtle)",
            }}
          >
            {channel.topic}
          </div>
        )}
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column-reverse",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
            <p style={{ fontWeight: 700, color: "var(--text-heading)" }}>
              Chào mừng đến # {channel.name}
            </p>
            <p style={{ fontSize: 13 }}>Hãy gửi tin nhắn đầu tiên!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages
              .slice()
              .reverse()
              .map((m) => (
                <div key={m.id} style={{ display: "flex", gap: 12 }}>
                  {m.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.user.image}
                      alt={m.user.name || "avatar"}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: "linear-gradient(135deg,#1B9E75,#5865F2)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >
                      {(m.user.name || m.user.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-heading)" }}>
                        {m.user.name || m.user.email}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {m.createdAt.toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, color: "var(--text-normal)", lineHeight: 1.5 }}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <form
        action={sendMessage}
        style={{ padding: 16, borderTop: "1px solid var(--border-subtle)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 12,
            background: "var(--bg-compose)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <input
            type="text"
            name="content"
            placeholder={`Gửi tin vào # ${channel.name}`}
            required
            autoComplete="off"
            style={{
              flex: 1,
              background: "transparent",
              outline: "none",
              border: "none",
              fontSize: 15,
              color: "var(--text-normal)",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              color: "#fff",
              background: "var(--brand-green)",
              border: "none",
            }}
          >
            Gửi
          </button>
        </div>
      </form>
    </>
  );
}
