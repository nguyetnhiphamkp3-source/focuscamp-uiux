import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?redirectTo=/settings");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, handle: true },
  });

  if (!user) redirect("/");

  redirect(`/u/${encodeURIComponent(user.handle ?? user.id)}`);
}
