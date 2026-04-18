import { DefaultRightSidebar } from "../_default-sidebar";

export const dynamic = "force-dynamic";

export default async function Default({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DefaultRightSidebar slug={slug} />;
}
