import Link from "next/link";
import { avatarColorFor, initials } from "@/lib/brand";

export type UserRow = {
  id: string;
  name: string | null;
  handle: string | null;
  image: string | null;
  bio: string | null;
};

/** Reusable row for followers/following lists. */
export function UserListRow({ user }: { user: UserRow }) {
  const name = user.name ?? "Ẩn danh";
  const handle = user.handle ?? user.id.slice(0, 8);
  return (
    <Link
      href={`/u/${handle}`}
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 12px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        textDecoration: "none",
        color: "inherit",
        alignItems: "flex-start",
        marginBottom: 6,
      }}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt=""
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: avatarColorFor(user.id),
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials(name)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--header-primary)",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          @{handle}
        </div>
        {user.bio && (
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {user.bio}
          </div>
        )}
      </div>
    </Link>
  );
}
