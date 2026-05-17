import Link from "next/link";
import { PreviewAsMemberToggle } from "./preview-as-member-toggle";

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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </Link>
      )}
    </div>
  );
}
