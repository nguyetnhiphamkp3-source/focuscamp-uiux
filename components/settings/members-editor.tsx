"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateMemberRoleAction,
  removeMemberAction,
} from "@/app/actions/community-settings";
import { avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";
import {
  classByKey,
  type ClassConfig,
  type LevelTier,
  tierForLevel,
} from "@/lib/community-config";
import { SectionHeader, btnDanger, ErrorBox } from "./editor-shared";
import { ConfirmModal } from "@/components/shared/confirm-modal";

export type MemberRow = {
  userId: string;
  role: string;
  tier: string;
  className: string | null;
  xp: number;
  level: number;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
    handle: string | null;
  };
};

export function MembersEditor({
  communityId,
  communitySlug,
  members,
  total,
  canManageRoles,
  ownerId,
  currentUserId,
  classes,
  levelTiers,
}: {
  communityId: string;
  communitySlug: string;
  members: MemberRow[];
  total: number;
  canManageRoles: boolean;
  ownerId: string;
  currentUserId: string;
  classes: ClassConfig[];
  levelTiers: LevelTier[];
}) {
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [removingMember, setRemovingMember] = useState<MemberRow | null>(null);
  const router = useRouter();

  const filtered = members.filter((m) => {
    if (!q.trim()) return true;
    const qq = q.trim().toLowerCase();
    return (
      m.user.name?.toLowerCase().includes(qq) ||
      m.user.email.toLowerCase().includes(qq) ||
      m.user.handle?.toLowerCase().includes(qq)
    );
  });

  function changeRole(targetUserId: string, role: string) {
    setErr(null);
    start(async () => {
      const res = await updateMemberRoleAction({
        communityId,
        communitySlug,
        targetUserId,
        role,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  function removeOne(m: MemberRow) {
    setRemovingMember(m);
  }

  function confirmRemove() {
    if (!removingMember) return;
    const m = removingMember;
    setRemovingMember(null);
    setErr(null);
    start(async () => {
      const res = await removeMemberAction({
        communityId,
        communitySlug,
        targetUserId: m.userId,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title={`Thành viên (${total})`}
        subtitle={
          canManageRoles
            ? "Quản lý role + xoá thành viên. Owner không thể bị xoá."
            : "Danh sách thành viên (read-only)."
        }
      />

      <input
        type="search"
        placeholder="Tìm theo tên / email / handle…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-chat)",
          color: "var(--text-normal)",
          fontSize: "var(--text-sm)",
          outline: "none",
          marginBottom: 12,
        }}
      />

      {filtered.length === 0 ? (
        <div
          style={{
            padding: 14,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          Không tìm thấy thành viên nào.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((m) => {
            const isSelfRow = m.userId === currentUserId;
            const isOwnerRow = m.userId === ownerId;
            const myClass = classByKey(m.className, classes);
            const tier = tierForLevel(m.level, levelTiers);
            const name = m.user.name || m.user.email;
            return (
              <div
                key={m.userId}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                }}
              >
                <Link
                  href={`/c/${communitySlug}/profile/${m.userId}`}
                  style={{ flexShrink: 0 }}
                >
                  {m.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.user.image}
                      alt=""
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: avatarColorFor(m.userId),
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {initials(name)}
                    </div>
                  )}
                </Link>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--header-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Link
                      href={`/c/${communitySlug}/profile/${m.userId}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {name}
                    </Link>
                    {isOwnerRow && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: "var(--text-xs)",
                          color: "var(--premium-gold)",
                          fontWeight: 700,
                        }}
                      >
                        ★ OWNER
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>Lv {m.level}</span>
                    <span>· {m.xp.toLocaleString()} XP</span>
                    {myClass && (
                      <span>
                        · {myClass.emoji ? `${myClass.emoji} ` : ""}
                        {myClass.label}
                      </span>
                    )}
                    {tier && <span>· {tier.name}</span>}
                    <span>· Tham gia {fmtRelativeTime(m.joinedAt)}</span>
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  {canManageRoles && !isSelfRow && !isOwnerRow ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.userId, e.target.value)}
                        disabled={pending}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border-subtle)",
                          background: "var(--bg-chat)",
                          color: "var(--text-normal)",
                          fontSize: "var(--text-xs)",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="MOD">MOD</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeOne(m)}
                        disabled={pending}
                        style={btnDanger}
                      >
                        Xoá
                      </button>
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        padding: "4px 10px",
                        background: "var(--bg-chat)",
                        borderRadius: 10,
                      }}
                    >
                      {m.role}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ErrorBox msg={err} />

      <ConfirmModal
        open={!!removingMember}
        title="Xoá thành viên"
        message={removingMember ? `Xoá thành viên "${removingMember.user.name ?? removingMember.user.email}" khỏi cộng đồng?\nHọ sẽ mất membership + streak + level ở community này.` : ""}
        confirmLabel="Xoá"
        danger
        onConfirm={confirmRemove}
        onCancel={() => setRemovingMember(null)}
      />

      {total > members.length && (
        <div
          style={{
            marginTop: 10,
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Hiển thị {members.length} / {total} thành viên. (Pagination đang hoàn thiện)
        </div>
      )}
    </section>
  );
}
