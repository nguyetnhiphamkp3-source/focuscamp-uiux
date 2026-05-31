import Link from "next/link";
import { PreviewAsMemberToggle } from "./preview-as-member-toggle";
import { Settings } from "lucide-react";

/**
 * Community header — community name + settings gear + (owner) preview toggle.
 */
export function CommunityHeader({
  slug,
  name,
  isOwner = false,
  canAccessSettings = false,
  previewAsMember = false,
}: {
  slug: string;
  name: string;
  isOwner?: boolean;
  isMember?: boolean;
  canAccessSettings?: boolean;
  previewAsMember?: boolean;
}) {
  return (
    <div
      style={{
        padding: "var(--space-4) var(--space-3)",
        borderBottom: "2px solid var(--border-strong)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "var(--text-md)",
          fontWeight: 700,
          color: "var(--header-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>

      {isOwner && <PreviewAsMemberToggle active={previewAsMember} />}

      {canAccessSettings && (
        <Link
          href={`/c/${slug}/settings`}
          title="Cài đặt cộng đồng"
          aria-label="Cài đặt cộng đồng"
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--r-md)",
            color: "var(--text-muted)",
            flexShrink: 0,
          }}
          className="chat-icon-btn"
        >
          <Settings size={16} />
        </Link>
      )}
    </div>
  );
}
