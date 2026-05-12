import Link from "next/link";
import { BRAND_GRADIENTS, initials } from "@/lib/brand";
import { CreateCommunityButton } from "./create-community-button";

export function ServerList({
  communities,
  activeSlug,
  onDiscovery,
}: {
  communities: { id: string; slug: string; name: string; iconUrl?: string | null }[];
  activeSlug?: string;
  onDiscovery?: boolean;
}) {
  return (
    <nav className="server-list">
      <div className="server-icon-wrapper">
        <Link
          href="/"
          className="server-icon"
          title="Điểm tập kết — focus.camp"
          style={{
            background: "var(--white)",
            textDecoration: "none",
          }}
        >
          <span
            role="img"
            aria-label="Điểm tập kết"
            style={{ fontSize: 22, lineHeight: 1 }}
          >🔥</span>
        </Link>
      </div>

      {communities.length > 0 && <div className="server-separator"></div>}

      {communities.map((c, i) => {
        const active = c.slug === activeSlug;
        return (
          <div key={c.id} className="server-icon-wrapper">
            <div className={`indicator ${active ? "active" : ""}`}></div>
            <Link
              href={`/c/${c.slug}`}
              className={`server-icon ${c.iconUrl ? "" : "server-icon-text"} ${active ? "active" : ""}`}
              style={
                c.iconUrl
                  ? { background: "var(--bg-card)", overflow: "hidden", padding: 0 }
                  : { background: BRAND_GRADIENTS[i % BRAND_GRADIENTS.length] }
              }
              title={c.name}
            >
              {c.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.iconUrl}
                  alt={c.name}
                  referrerPolicy="no-referrer"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                initials(c.name)
              )}
            </Link>
          </div>
        );
      })}

      {communities.length > 0 && <div className="server-separator"></div>}

      <div className="server-icon-wrapper">
        <CreateCommunityButton />
      </div>
      <div className="server-icon-wrapper">
        {onDiscovery && <div className="indicator active"></div>}
        <Link
          href="/discovery"
          className={`server-icon explore-server ${onDiscovery ? "active" : ""}`}
          title="Discovery"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
