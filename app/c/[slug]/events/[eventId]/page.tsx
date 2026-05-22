import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtVnd } from "@/lib/brand";
import { fetchPostMeetingData } from "@/lib/services/event";
import { EventRsvpButton } from "@/components/community/event-rsvp-button";
import { EventMeetingUrlEditor } from "@/components/community/event-meeting-url-editor";
import { EventAdminActions } from "@/components/community/event-admin-actions";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = await params;
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

  const event = await prisma.event.findFirst({
    where: { id: eventId, communityId: community.id },
    include: {
      owner: { select: { name: true, image: true } },
      _count: { select: { bookings: true } },
      bookings: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true, status: true, attendedAt: true } }
        : false,
    },
  });
  if (!event) notFound();

  const realIsOwner = session?.user?.id === community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: Array.isArray(community.memberships)
      ? community.memberships[0]?.role
      : null,
  });
  const canManageEvent = canCommunity(role, "manage_events");
  const myBooking = session?.user?.id ? (event.bookings as { id: string; status: string; attendedAt: Date | null }[])[0] ?? null : null;
  const confirmed = myBooking?.status === "CONFIRMED" || myBooking?.status === "ATTENDED";
  const full = event._count.bookings >= event.capacity;
  const now = new Date();
  const endTime = new Date(event.startsAt.getTime() + event.durationMin * 60_000);
  const isEnded = now > endTime;
  const isUpcoming = now < new Date(event.startsAt);
  const isLive = !isUpcoming && !isEnded;

  // Lazy-fetch post-meeting data after event ends (owner's token)
  let postMeeting: { recordingUrl: string | null; transcriptUrl: string | null } | null = null;
  if (isEnded && event.meetSpaceName && canManageEvent && session?.user?.id) {
    postMeeting = await fetchPostMeetingData(eventId, session.user.id).catch(() => null);
    if (!postMeeting && (event.meetRecordingUrl || event.meetTranscriptUrl)) {
      postMeeting = { recordingUrl: event.meetRecordingUrl, transcriptUrl: event.meetTranscriptUrl };
    }
  } else if (isEnded && (event.meetRecordingUrl || event.meetTranscriptUrl)) {
    postMeeting = { recordingUrl: event.meetRecordingUrl, transcriptUrl: event.meetTranscriptUrl };
  }

  // Event managers: list all confirmed bookings
  let allBookings: { id: string; status: string; attendedAt: Date | null; user: { name: string | null; email: string; image: string | null } }[] = [];
  if (canManageEvent) {
    allBookings = await prisma.eventBooking.findMany({
      where: { eventId, status: { in: ["CONFIRMED", "ATTENDED"] } },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  const typeLabel =
    event.type === "ONE_ON_ONE" ? "👤 1-on-1" : event.type === "WORKSHOP" ? "🎓 Workshop" : "🎤 Live";

  return (
    <>
      <header className="view-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="view-title">{event.title}</span>
          <span className="view-subtitle">{typeLabel} · {event.durationMin}p</span>
        </div>
        {canManageEvent && (
          isLive ? (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Đang diễn ra — không thể sửa
            </span>
          ) : (
            <EventAdminActions
              communitySlug={slug}
              event={{
                id: event.id,
                type: event.type as "ONE_ON_ONE" | "GROUP_LIVE" | "WORKSHOP",
                title: event.title,
                description: event.description,
                startsAt: event.startsAt.toISOString(),
                durationMin: event.durationMin,
                capacity: event.capacity,
                priceVnd: event.priceVnd,
                meetingUrl: event.meetingUrl,
                bannerUrl: event.bannerUrl,
              }}
            />
          )
        )}
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Banner / header card */}
          <div
            style={{
              background: event.bannerUrl
                ? `url("${event.bannerUrl}") center/cover`
                : "linear-gradient(135deg, var(--bg-elevated), var(--bg-card))",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              padding: event.bannerUrl ? "80px 24px 24px" : "24px",
              position: "relative",
              minHeight: event.bannerUrl ? 200 : "auto",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "3px 10px",
                borderRadius: 6,
                background: isEnded ? "rgba(0,0,0,0.5)" : "var(--brand-green)",
                color: "#fff",
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {isEnded ? "Đã kết thúc" : isUpcoming ? "Sắp diễn ra" : "Đang diễn ra"}
            </div>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: event.bannerUrl ? "#fff" : "var(--header-primary)", textShadow: event.bannerUrl ? "0 1px 4px rgba(0,0,0,0.6)" : "none" }}>
              {event.title}
            </div>
            <div style={{ marginTop: 6, fontSize: "var(--text-sm)", color: event.bannerUrl ? "rgba(255,255,255,0.85)" : "var(--text-muted)" }}>
              🗓 {event.startsAt.toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" })}
              {" · "}{event.durationMin}p · 👥 {event._count.bookings}/{event.capacity}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 20, lineHeight: 1.7, color: "var(--text-normal)" }}>
              {event.description}
            </div>
          )}

          {/* Join / booking section */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--header-primary)" }}>
                  {event.isFree ? "Miễn phí" : `${fmtVnd(event.priceVnd)}đ`}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                  {event._count.bookings} / {event.capacity} chỗ đã book
                </div>
              </div>

              {/* CTA */}
              {!isEnded && !canManageEvent && (
                confirmed ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ padding: "4px 12px", borderRadius: 8, background: "var(--success-soft)", color: "var(--success)", fontSize: "var(--text-sm)", fontWeight: 700 }}>
                      ✓ Đã book
                    </div>
                    {event.meetingUrl && (
                      <a
                        href={event.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: "10px 20px", borderRadius: 8, background: "var(--brand-green)", color: "#fff", fontWeight: 700, fontSize: "var(--text-sm)", textDecoration: "none" }}
                      >
                        🎥 Join Meet
                      </a>
                    )}
                  </div>
                ) : !session?.user?.id ? (
                  <a href="/login" style={{ padding: "10px 20px", borderRadius: 8, background: "var(--brand-green)", color: "#fff", fontWeight: 700, fontSize: "var(--text-sm)", textDecoration: "none" }}>
                    Đăng nhập để book
                  </a>
                ) : full ? (
                  <div style={{ padding: "10px 20px", borderRadius: 8, background: "var(--bg-modifier-hover)", color: "var(--text-muted)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                    Đã đủ chỗ
                  </div>
                ) : (
                  <EventRsvpButton
                    eventId={event.id}
                    communitySlug={slug}
                    isFree={event.isFree}
                    priceVnd={event.priceVnd ?? 0}
                    full={full}
                  />
                )
              )}

              {/* Event manager: show meet link directly */}
              {canManageEvent && event.meetingUrl && !isEnded && (
                <a
                  href={event.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: "10px 20px", borderRadius: 8, background: "var(--brand-green)", color: "#fff", fontWeight: 700, fontSize: "var(--text-sm)", textDecoration: "none" }}
                >
                  🎥 Mở Meet
                </a>
              )}
            </div>

            {/* Meet link info */}
            {event.meetingUrl && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", wordBreak: "break-all" }}>
                🔗 {event.meetingUrl}
              </div>
            )}

            {/* Event manager: set/update meeting URL */}
            {canManageEvent && !isEnded && (
              <EventMeetingUrlEditor
                eventId={event.id}
                communitySlug={slug}
                currentUrl={event.meetingUrl}
              />
            )}
          </div>

          {/* Post-meeting: recording + transcript */}
          {isEnded && postMeeting && (postMeeting.recordingUrl || postMeeting.transcriptUrl) && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--header-primary)", marginBottom: 12 }}>
                📼 Tài liệu sau buổi học
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {postMeeting.recordingUrl && (
                  <a
                    href={postMeeting.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)", color: "var(--text-link)", fontSize: "var(--text-sm)", fontWeight: 600, textDecoration: "none" }}
                  >
                    🎬 Xem lại recording
                  </a>
                )}
                {postMeeting.transcriptUrl && (
                  <a
                    href={postMeeting.transcriptUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)", color: "var(--text-link)", fontSize: "var(--text-sm)", fontWeight: 600, textDecoration: "none" }}
                  >
                    📝 Xem transcript
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Event manager: attendee list */}
          {canManageEvent && allBookings.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--header-primary)", marginBottom: 12 }}>
                👥 Danh sách đăng ký ({allBookings.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allBookings.map((b) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {b.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.user.image} alt="" referrerPolicy="no-referrer" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: 700 }}>
                        {(b.user.name || b.user.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", flex: 1 }}>
                      {b.user.name || b.user.email}
                    </span>
                    {b.status === "ATTENDED" && (
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: 700 }}>✓ Đã tham dự</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
