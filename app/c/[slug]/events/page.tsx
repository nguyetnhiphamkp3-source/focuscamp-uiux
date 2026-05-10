import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listEvents, bookEvent } from "@/lib/services/event";
import { fmtVnd } from "@/lib/brand";
import { CreateEventButton } from "@/components/community/create-event-button";

export const dynamic = "force-dynamic";

export default async function EventsListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, name: true, ownerId: true },
  });
  if (!community) notFound();
  const isOwner = session?.user?.id === community.ownerId;

  const events = await listEvents({ communityId: community.id, scope: "upcoming" });

  async function bookAction(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user?.id) redirect("/login");
    const eventId = String(formData.get("eventId") || "");
    if (!eventId) return;
    try {
      const res = await bookEvent({ userId: s.user!.id!, eventId });
      if (res.status === "PENDING_PAYMENT") {
        redirect(`/pay/${res.paymentCode}`);
      }
    } catch {
      // swallow — UI shows generic error in detail
    }
  }

  return (
    <>
      <header className="view-header">
        <span className="view-title">Events</span>
        <span className="view-subtitle">Sự kiện sắp tới của {community.name}</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          {isOwner && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <CreateEventButton communityId={community.id} communitySlug={slug} />
            </div>
          )}

          {events.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
                border: "1px dashed var(--border-subtle)",
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <div style={{ fontWeight: 700, color: "var(--header-primary)" }}>
                Chưa có event nào sắp tới
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {events.map((e) => {
                const free = e.isFree || e.priceVnd === 0;
                const startsAt = new Date(e.startsAt);
                const full = e._count.bookings >= e.capacity;
                return (
                  <Link
                    key={e.id}
                    href={`/c/${slug}/events/${e.id}`}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {e.type === "ONE_ON_ONE"
                          ? "👤 1-on-1"
                          : e.type === "WORKSHOP"
                            ? "🎓 Workshop"
                            : "🎤 Live"}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-md)",
                          fontWeight: 700,
                          color: "var(--header-primary)",
                        }}
                      >
                        {e.title}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                          marginTop: 4,
                        }}
                      >
                        🗓 {startsAt.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                        {" · "}⏱ {e.durationMin}p
                        {" · "}👥 {e._count.bookings}/{e.capacity}
                      </div>
                      {e.description && (
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--text-normal)",
                            marginTop: 8,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {e.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "var(--text-md)",
                          color: free ? "var(--success)" : "var(--brand-green)",
                        }}
                      >
                        {free ? "Miễn phí" : `${fmtVnd(e.priceVnd)}đ`}
                      </div>
                      <form action={bookAction}>
                        <input type="hidden" name="eventId" value={e.id} />
                        <button
                          type="submit"
                          disabled={full}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: full
                              ? "var(--bg-modifier-hover)"
                              : "var(--brand-green)",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "var(--text-sm)",
                            cursor: full ? "not-allowed" : "pointer",
                          }}
                        >
                          {full ? "Đã đủ chỗ" : free ? "RSVP" : "Book ngay"}
                        </button>
                      </form>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
