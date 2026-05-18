import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listConversations, listMessages, hasAgentApiKey } from "@/lib/services/agent";
import { AgentChat } from "@/components/agent/agent-chat";

export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { slug } = await params;
  const { c: conversationParam } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!community) notFound();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: session.user.id,
        communityId: community.id,
      },
    },
    select: { id: true, role: true },
  });
  if (!membership) {
    return (
      <div
        style={{
          margin: "auto",
          padding: 40,
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Bạn cần là thành viên cộng đồng để chat với Agent.
      </div>
    );
  }

  const hasKey = await hasAgentApiKey(community.id);
  if (!hasKey) {
    const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
    return (
      <>
        <header className="view-header">
          <span className="view-title">AI Agent</span>
          <span className="view-subtitle">{community.name}</span>
        </header>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: 40,
            textAlign: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 40 }}>🤖</div>
          <div
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--header-primary)",
            }}
          >
            AI Agent chưa được kích hoạt
          </div>
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              maxWidth: 400,
            }}
          >
            {isAdmin
              ? "Bạn cần nhập Anthropic API Key trong Cài đặt → AI Agent để kích hoạt tính năng này."
              : "Chủ cộng đồng chưa cấu hình AI Agent. Vui lòng liên hệ admin."}
          </div>
          {isAdmin && (
            <a
              href={`/c/${slug}/settings`}
              style={{
                marginTop: 8,
                padding: "8px 16px",
                background: "var(--brand-green)",
                color: "#fff",
                borderRadius: "var(--r-md)",
                textDecoration: "none",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
              }}
            >
              Đi tới Cài đặt
            </a>
          )}
        </div>
      </>
    );
  }

  // Pick conversation: ?c=<id> if passed, else most recent, else null (new convo on send)
  let conversationId: string | null = null;
  let initialMessages: Awaited<ReturnType<typeof listMessages>> = [];

  if (conversationParam) {
    const conv = await prisma.agentConversation.findUnique({
      where: { id: conversationParam },
      select: { id: true, userId: true, communityId: true },
    });
    if (conv && conv.userId === session.user.id && conv.communityId === community.id) {
      conversationId = conv.id;
      initialMessages = await listMessages(conv.id);
    }
  }

  if (!conversationId) {
    const convs = await listConversations(session.user.id, community.id);
    if (convs.length > 0) {
      conversationId = convs[0].id;
      initialMessages = await listMessages(conversationId);
    }
  }

  return (
    <>
      <header className="view-header">
        <span className="view-title">AI Agent</span>
        <span className="view-subtitle">{community.name}</span>
      </header>
      <AgentChat
        communityId={community.id}
        conversationId={conversationId}
        initialMessages={initialMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }))}
      />
    </>
  );
}
