import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TelegramLinkPanel } from "@/components/settings/telegram-link-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Integrations — focus.camp",
};

export default async function IntegrationsPage() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login?redirectTo=/settings/integrations");

  const user = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { telegramUserId: true, telegramUsername: true },
  });

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <header className="view-header">
        <span className="view-title">Integrations</span>
        <span className="view-subtitle">Liên kết account với các kênh ngoài</span>
      </header>
      <div style={{ padding: "var(--space-5) var(--space-6)", maxWidth: 720, margin: "0 auto" }}>
        <TelegramLinkPanel
          initial={{
            telegramUsername: user?.telegramUsername ?? null,
            isLinked: !!user?.telegramUserId,
          }}
        />
      </div>
    </div>
  );
}
