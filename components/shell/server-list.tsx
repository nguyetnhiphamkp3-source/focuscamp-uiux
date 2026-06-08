import Link from "next/link";
import { BRAND_GRADIENTS, initials } from "@/lib/brand";
import { CreateCommunityButton } from "./create-community-button";
import { Globe } from "lucide-react";

export function ServerList({
  communities,
  activeSlug,
  onDiscovery,
}: {
  communities: { id: string; slug: string; name: string; iconUrl?: string | null; isOwner?: boolean }[];
  activeSlug?: string;
  onDiscovery?: boolean;
}) {
  return (
    <nav className="server-list">
      <div className="server-icon-wrapper">
        <Link
          href="/"
          prefetch={false}
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
              prefetch={false}
              className={`server-icon ${c.iconUrl ? "" : "server-icon-text"} ${active ? "active" : ""} ${c.isOwner ? "server-icon--owner" : ""}`}
              style={
                c.iconUrl
                  ? { background: "var(--bg-card)", overflow: "hidden", padding: 0 }
                  : { background: BRAND_GRADIENTS[i % BRAND_GRADIENTS.length] }
              }
              title={c.isOwner ? `${c.name} (của bạn)` : c.name}
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
          prefetch={false}
          className={`server-icon explore-server ${onDiscovery ? "active" : ""}`}
          title="Discovery"
        >
          <Globe size={24} />
        </Link>
      </div>
    </nav>
  );
}
