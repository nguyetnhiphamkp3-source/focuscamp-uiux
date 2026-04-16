"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveMemberAction,
  rejectMemberAction,
} from "@/app/actions/challenge-review";
import { avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";

export type PendingMember = {
  id: string;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
    handle: string | null;
  };
};

export function PendingMembersPanel({
  communitySlug,
  challengeSlug,
  members,
}: {
  communitySlug: string;
  challengeSlug: string;
  members: PendingMember[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function approve(memberId: string) {
    setErr(null);
    start(async () => {
      const res = await approveMemberAction({
        memberId,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  function reject(memberId: string) {
    setErr(null);
    start(async () => {
      const res = await rejectMemberAction({
        memberId,
        note,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        setRejecting(null);
        setNote("");
        router.refresh();
      } else setErr(res.reason);
    });
  }

  if (members.length === 0) return null;

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <h3
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--header-primary)",
          margin: "0 0 12px 0",
        }}
      >
        Đơn xin tham gia ({members.length})
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {members.map((m) => {
          const name = m.user.name || m.user.email;
          const isRejecting = rejecting === m.id;
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                gap: 10,
                padding: 10,
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <Link
                href={`/c/${communitySlug}/profile/${m.user.id}`}
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
                      background: avatarColorFor(m.user.id),
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
                <Link
                  href={`/c/${communitySlug}/profile/${m.user.id}`}
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--header-primary)",
                    textDecoration: "none",
                  }}
                >
                  {name}
                </Link>
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  Xin vào {fmtRelativeTime(m.joinedAt)}
                </div>
              </div>
              {!isRejecting ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => approve(m.id)}
                    disabled={pending}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "none",
                      background: "var(--success)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "var(--text-xs)",
                      cursor: "pointer",
                    }}
                  >
                    ✓ Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(m.id)}
                    disabled={pending}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--danger)",
                      background: "transparent",
                      color: "var(--danger)",
                      fontWeight: 600,
                      fontSize: "var(--text-xs)",
                      cursor: "pointer",
                    }}
                  >
                    ✕ Từ chối
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Lý do từ chối (tuỳ chọn)…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={pending}
                    maxLength={1000}
                    autoFocus
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-chat)",
                      color: "var(--text-normal)",
                      fontSize: "var(--text-sm)",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(null);
                        setNote("");
                      }}
                      disabled={pending}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border-subtle)",
                        background: "transparent",
                        color: "var(--interactive-normal)",
                        fontSize: "var(--text-xs)",
                        cursor: "pointer",
                      }}
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(m.id)}
                      disabled={pending}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: "none",
                        background: "var(--danger)",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "var(--text-xs)",
                        cursor: "pointer",
                      }}
                    >
                      Xác nhận từ chối
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {err && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
            background: "rgba(218,55,60,0.08)",
            borderRadius: 6,
          }}
        >
          {err}
        </div>
      )}
    </section>
  );
}
