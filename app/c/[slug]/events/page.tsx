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

function pageHref(slug: string, tab: "upcoming" | "past", page: number) {
  const base = tab === "upcoming" ? `/c/${slug}/events` : `/c/${slug}/events?tab=past`;
  if (page <= 1) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}page=${page}`;
}

export default async function EventsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { tab, page: pageStr } = await searchParams;
  const activeTab: "upcoming" | "past" = tab === "past" ? "past" : "upcoming";
  const currentPage = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
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

  const result = await listEvents({ communityId: community.id, scope: activeTab, page: currentPage });
  const { events, totalPages } = result;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Events</span>
        <span className="view-subtitle">Sự kiện của {community.name}</span>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <TabLink slug={slug} tab="upcoming" active={activeTab === "upcoming"} label="Sắp tới" />
            <TabLink slug={slug} tab="past" active={activeTab === "past"} label="Đã kết thúc" />
            {canCreateEvent && (
              <div style={{ marginLeft: "auto" }}>
                <CreateEventButton communityId={community.id} communitySlug={slug} />
              </div>
            )}
          </div>

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
                {activeTab === "upcoming" ? "Chưa có event nào sắp tới" : "Chưa có event nào đã kết thúc"}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {events.map((e) => {
                  const free = e.isFree || e.priceVnd === 0;
                  const startsAt = new Date(e.startsAt);
                  const full = e._count.bookings >= e.capacity;
                  const isPast = activeTab === "past";
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
                        opacity: isPast ? 0.75 : 1,
                      }}
                    >
                      <Link
                        href={`/c/${slug}/events/${e.id}`}
                        style={{ flex: 1, minWidth: 200, textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          <span>
                            {e.type === "ONE_ON_ONE"
                              ? "👤 1-on-1"
                              : e.type === "WORKSHOP"
                                ? "🎓 Workshop"
                                : "🎤 Live"}
                          </span>
                          {isPast && (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "var(--bg-elevated)",
                                color: "var(--text-muted)",
                                letterSpacing: 0,
                                textTransform: "none",
                              }}
                            >
                              Đã kết thúc
                            </span>
                          )}
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

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                        {!isPast && (
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "var(--text-md)",
                              color: free ? "var(--success)" : "var(--brand-green)",
                            }}
                          >
                            {free ? "Miễn phí" : `${fmtVnd(e.priceVnd)}đ`}
                          </div>
                        )}
                        {isPast ? (
                          e.meetRecordingUrl ? (
                            <a
                              href={e.meetRecordingUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: "8px 14px",
                                borderRadius: 8,
                                background: "var(--bg-elevated)",
                                color: "var(--text-link)",
                                fontWeight: 600,
                                fontSize: "var(--text-sm)",
                                textDecoration: "none",
                              }}
                            >
                              🎬 Xem recording
                            </a>
                          ) : (
                            <Link
                              href={`/c/${slug}/events/${e.id}`}
                              style={{
                                padding: "8px 14px",
                                borderRadius: 8,
                                background: "transparent",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--interactive-normal)",
                                fontWeight: 600,
                                fontSize: "var(--text-sm)",
                                textDecoration: "none",
                              }}
                            >
                              Xem chi tiết
                            </Link>
                          )
                        ) : (
                          <EventRsvpButton
                            eventId={e.id}
                            communitySlug={slug}
                            isFree={free}
                            priceVnd={e.priceVnd ?? 0}
                            full={full}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  {currentPage > 1 && (
                    <Link
                      href={pageHref(slug, activeTab, currentPage - 1)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        textDecoration: "none",
                        background: "var(--bg-elevated)",
                        color: "var(--interactive-normal)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      ← Trước
                    </Link>
                  )}
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-muted)",
                      padding: "8px 12px",
                    }}
                  >
                    Trang {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages && (
                    <Link
                      href={pageHref(slug, activeTab, currentPage + 1)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        textDecoration: "none",
                        background: "var(--bg-elevated)",
                        color: "var(--interactive-normal)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      Tiếp →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function TabLink({
  slug,
  tab,
  active,
  label,
}: {
  slug: string;
  tab: "upcoming" | "past";
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={tab === "upcoming" ? `/c/${slug}/events` : `/c/${slug}/events?tab=past`}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        textDecoration: "none",
        background: active ? "var(--brand-green)" : "transparent",
        color: active ? "#fff" : "var(--interactive-normal)",
        border: active ? "1px solid var(--brand-green)" : "1px solid var(--border-subtle)",
      }}
    >
      {label}
    </Link>
  );
}