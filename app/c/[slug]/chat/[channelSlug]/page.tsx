import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
    include: { channels: { orderBy: { position: "asc" } } },
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
    <div
      className="min-h-screen flex"
      style={{ background: "var(--bg-body)" }}
    >
      {/* Channels sidebar */}
      <aside
        className="w-64 flex-shrink-0 p-4"
        style={{
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <Link
          href={`/c/${slug}`}
          className="block font-bold text-lg mb-4"
          style={{ color: "var(--text-heading)", fontFamily: "var(--font-roboto)" }}
        >
          {community.name}
        </Link>
        <div
          className="text-xs uppercase font-bold mb-2 px-2"
          style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
        >
          Channels
        </div>
        <nav className="flex flex-col gap-1">
          {community.channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/c/${slug}/chat/${ch.slug}`}
              className="px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
              style={{
                background:
                  ch.slug === channelSlug
                    ? "var(--bg-modifier-active)"
                    : "transparent",
                color:
                  ch.slug === channelSlug
                    ? "var(--interactive-active)"
                    : "var(--text-muted)",
                fontWeight: ch.slug === channelSlug ? 700 : 500,
              }}
            >
              <span style={{ opacity: 0.7 }}>#</span>
              {ch.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main chat */}
      <main className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 px-6 flex items-center"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            className="font-bold text-lg"
            style={{
              color: "var(--text-heading)",
              fontFamily: "var(--font-roboto)",
            }}
          >
            # {channel.name}
          </div>
          {channel.topic && (
            <div
              className="ml-4 pl-4 text-sm"
              style={{
                color: "var(--text-muted)",
                borderLeft: "1px solid var(--border-subtle)",
              }}
            >
              {channel.topic}
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col-reverse">
          {messages.length === 0 ? (
            <div
              className="text-center py-20"
              style={{ color: "var(--text-muted)" }}
            >
              <div className="text-4xl mb-2">👋</div>
              <p className="font-bold" style={{ color: "var(--text-heading)" }}>
                Chào mừng đến # {channel.name}
              </p>
              <p className="text-sm">Đây là đầu kênh. Hãy gửi tin nhắn đầu tiên!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages
                .slice()
                .reverse()
                .map((m) => (
                  <div key={m.id} className="flex gap-3">
                    {m.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.user.image}
                        alt={m.user.name || "avatar"}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, #5865F2, #eb459e)",
                        }}
                      >
                        {(m.user.name || m.user.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="font-bold text-sm"
                          style={{ color: "var(--text-heading)" }}
                        >
                          {m.user.name || m.user.email}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {m.createdAt.toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className="text-base"
                        style={{ color: "var(--text-normal)", lineHeight: 1.5 }}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Compose */}
        <form
          action={sendMessage}
          className="p-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{
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
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: "var(--text-normal)" }}
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md font-bold text-sm text-white"
              style={{ background: "var(--brand-green)" }}
            >
              Gửi
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
