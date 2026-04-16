import Link from "next/link";
import { BRAND_GRADIENTS, initials } from "@/lib/brand";

export function ServerList({
  communities,
  activeSlug,
  onDiscovery,
}: {
  communities: { id: string; slug: string; name: string }[];
  activeSlug?: string;
  onDiscovery?: boolean;
}) {
  return (
    <nav className="server-list">
      <div className="server-icon-wrapper">
        <Link
          href="/"
          title="Điểm tập kết — focus.camp"
          style={{
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ff7043",
            textDecoration: "none",
          }}
        >
          {/* Flame icon — free, no box */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
          </svg>
        </Link>
      </div>

      <div className="server-separator"></div>

      {communities.map((c, i) => {
        const active = c.slug === activeSlug;
        return (
          <div key={c.id} className="server-icon-wrapper">
            <div className={`indicator ${active ? "active" : ""}`}></div>
            <Link
              href={`/c/${c.slug}`}
              className={`server-icon server-icon-text ${active ? "active" : ""}`}
              style={{ background: BRAND_GRADIENTS[i % BRAND_GRADIENTS.length] }}
              title={c.name}
            >
              {initials(c.name)}
            </Link>
          </div>
        );
      })}

      <div className="server-separator"></div>

      <div className="server-icon-wrapper">
        <div className="server-icon add-server">+</div>
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
