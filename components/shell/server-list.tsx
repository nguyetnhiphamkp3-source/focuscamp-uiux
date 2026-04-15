import Link from "next/link";

const BRAND_GRADIENTS = [
  "linear-gradient(135deg,#c77a2d,#8a4f1e)",
  "linear-gradient(135deg,#5865F2,#eb459e)",
  "linear-gradient(135deg,#1abc9c,#0d7c62)",
  "linear-gradient(135deg,#9b59b6,#6a3d72)",
  "linear-gradient(135deg,#f39c12,#d35400)",
];

function initials(name: string) {
  const w = name.split(/\s+/).filter(Boolean);
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

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
        <Link href="/" className="server-icon dm-button" title="Trang chủ">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1.01 1.01 0 003.8 21.454l3.032-.892A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
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
