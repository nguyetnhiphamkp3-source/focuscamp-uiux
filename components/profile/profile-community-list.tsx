import Link from "next/link";
import { avatarColorFor, initials } from "@/lib/brand";

type OtherCommunity = {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
};

export function ProfileCommunityList({
  otherCommunities,
  viewingUserId,
  isSelf,
}: {
  otherCommunities: OtherCommunity[];
  viewingUserId: string;
  isSelf: boolean;
}) {
  if (otherCommunities.length === 0) return null;

  return (
    <div className="pf-section" style={{ marginTop: 20 }}>
      <h3>
        {isSelf
          ? `Bạn cũng active ở ${otherCommunities.length} cộng đồng khác`
          : `Cũng active ở ${otherCommunities.length} cộng đồng khác`}
      </h3>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginBottom: 10,
        }}
      >
        Chỉ hiển thị danh sách cộng đồng — class / level / XP của từng cộng
        đồng là riêng tư và chỉ hiện khi bạn vào cộng đồng đó.
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {otherCommunities.map((c) => (
          <Link
            key={c.id}
            href={`/c/${c.slug}/profile/${viewingUserId}`}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "8px 12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 999,
              textDecoration: "none",
              color: "var(--text-normal)",
              fontSize: "var(--text-sm)",
            }}
          >
            {c.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.iconUrl}
                alt=""
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: avatarColorFor(c.id),
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--text-xs)",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials(c.name)}
              </div>
            )}
            <span style={{ fontWeight: 500 }}>{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
