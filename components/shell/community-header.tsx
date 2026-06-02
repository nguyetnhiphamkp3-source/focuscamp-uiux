import Link from "next/link";
import { PreviewAsMemberToggle } from "./preview-as-member-toggle";
import { Settings } from "lucide-react";

export function CommunityHeader({
  slug,
  name,
  iconUrl,
  isOwner = false,
  canAccessSettings = false,
  previewAsMember = false,
}: {
  slug: string;
  name: string;
  iconUrl?: string | null;
  isOwner?: boolean;
  isMember?: boolean;
  canAccessSettings?: boolean;
  previewAsMember?: boolean;
}) {
  return (
    <div
      style={{
        padding: "0 var(--space-3)",
        height: 52,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        flexShrink: 0,
      }}
    >
      <Link
        href={`/c/${slug}`}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          textDecoration: "none",
        }}
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt={name}
            style={{ width: 28, height: 28, borderRadius: "var(--r-md)", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 28, height: 28, borderRadius: "var(--r-md)", flexShrink: 0,
              background: "var(--brand-green)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <span
          style={{
            fontSize: "var(--text-md)", fontWeight: 700,
            color: "var(--header-primary)", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
      </Link>

      {isOwner && <PreviewAsMemberToggle active={previewAsMember} />}

      {canAccessSettings && (
        <Link
          href={`/c/${slug}/settings`}
          title="Cài đặt cộng đồng"
          aria-label="Cài đặt cộng đồng"
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-md)", color: "var(--text-muted)", flexShrink: 0 }}
          className="chat-icon-btn"
        >
          <Settings size={16} />
        </Link>
      )}
    </div>
  );
}
