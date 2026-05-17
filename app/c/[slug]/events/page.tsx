import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listEvents } from "@/lib/services/event";
import { fmtVnd } from "@/lib/brand";
import { CreateEventButton } from "@/components/community/create-event-button";
import { EventRsvpButton } from "@/components/community/event-rsvp-button";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";

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
    select: {
      id: true,
      name: true,
      ownerId: true,
      memberships: session?.user?.id
        ? { where: { userId: session.user.id }, select: { role: true } }
        : false,
    },
  });
  if (!community) notFound();
  const realIsOwner = session?.user?.id === community.ownerId;
  const { effectiveIsOwner: isOwner, previewAsMember } = await getEffectiveOwnership(realIsOwner);
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: previewAsMember
      ? null
      : Array.isArray(community.memberships)
        ? community.memberships[0]?.role
        : null,
  });
  const canCreateEvent = canCommunity(role, "manage_events");

  const events = await listEvents({ communityId: community.id, scope: "upcoming" });

  return (
    <>
      <header className="view-header">
        <span className="view-title">Events</span>
        <span className="view-subtitle">Sự kiện sắp tới của {community.name}</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          {canCreateEvent && (
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
                  <div
                    key={e.id}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Clickable content area — Link wraps only the text block */}
                    <Link
                      href={`/c/${slug}/events/${e.id}`}
                      style={{ flex: 1, minWidth: 200, textDecoration: "none", color: "inherit" }}
                    >
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
                        🗓 {`${startsAt.getDate().toString().padStart(2, "0")}/${(startsAt.getMonth() + 1).toString().padStart(2, "0")}/${startsAt.getFullYear()} ${startsAt.getHours().toString().padStart(2, "0")}:${startsAt.getMinutes().toString().padStart(2, "0")}`}
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
                    </Link>

                    {/* Price + RSVP — outside Link, no overlap */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "var(--text-md)",
                          color: free ? "var(--success)" : "var(--brand-green)",
                        }}
                      >
                        {free ? "Miễn phí" : `${fmtVnd(e.priceVnd)}đ`}
                      </div>
                      <EventRsvpButton
                        eventId={e.id}
                        communitySlug={slug}
                        isFree={free}
                        priceVnd={e.priceVnd ?? 0}
                        full={full}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
