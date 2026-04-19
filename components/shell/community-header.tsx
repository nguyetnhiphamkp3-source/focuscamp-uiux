import Link from "next/link";

/**
 * Community header — community name + settings gear.
 */
export function CommunityHeader({
  slug,
  name,
  isOwner = false,
}: {
  slug: string;
  name: string;
  isOwner?: boolean;
  isMember?: boolean;
}) {
  return (
    <div
      style={{
        padding: "var(--space-3)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: "var(--header-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>

      {isOwner && (
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

/**
 * Community search bar — used in right sidebar under banner.
 */
export function CommunitySearchBar({ name }: { name: string }) {
  return (
    <div
      style={{
        padding: "var(--space-2) var(--space-3)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-elevated)",
          height: 36,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ color: "var(--text-muted)", flexShrink: 0 }}
        >
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder={`Tìm trong ${name.split(" ").slice(0, 2).join(" ")}…`}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "var(--text-xs)",
            color: "var(--text-normal)",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}
