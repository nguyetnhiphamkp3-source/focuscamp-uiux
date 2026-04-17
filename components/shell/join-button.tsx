"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinCommunityAction } from "@/app/actions/community";
import type { ClassConfig } from "@/lib/community-config";

export function JoinButton({
  communityId,
  communitySlug,
  classes,
  currentClassKey = null,
  label = "Tham gia cộng đồng",
  variant = "primary",
}: {
  communityId: string;
  communitySlug: string;
  /** Pass empty array for "no class system" — then modal is skipped. */
  classes: ClassConfig[];
  /** If user is re-picking class (already member) — highlight current. */
  currentClassKey?: string | null;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string>(currentClassKey ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const hasClasses = classes.length > 0;

  function directJoin() {
    setErr(null);
    start(async () => {
      const res = await joinCommunityAction({ communityId, communitySlug });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  function joinWithClass() {
    setErr(null);
    if (!picked) {
      setErr("Hãy chọn một class trước khi tham gia");
      return;
    }
    start(async () => {
      const res = await joinCommunityAction({
        communityId,
        communitySlug,
        className: picked,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  function onClickMain() {
    if (hasClasses) setOpen(true);
    else directJoin();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClickMain}
        disabled={pending}
        className={`rs-join-btn ${variant}`}
        style={{ margin: "4px 0", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Đang xử lý…" : label}
      </button>
      {err && !open && (
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
            marginTop: 4,
          }}
        >
          {err}
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--bg-floating)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              maxWidth: 520,
              width: "100%",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  color: "var(--header-primary)",
                  marginBottom: 4,
                }}
              >
                Chọn class của bạn
              </div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                }}
              >
                Cộng đồng này phân thành viên theo class. Chọn class phù hợp với
                bạn nhất — có thể đổi lại sau.
              </div>
            </div>

            <div
              style={{
                padding: "14px 20px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {classes.map((c) => {
                const selected = picked === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setPicked(c.key)}
                    disabled={pending}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: selected
                        ? "2px solid var(--brand-green)"
                        : "1px solid var(--border-subtle)",
                      background: selected
                        ? "rgba(27,158,117,0.08)"
                        : "var(--bg-card)",
                      color: "var(--text-normal)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    {c.emoji && (
                      <div style={{ fontSize: 28, lineHeight: 1 }}>{c.emoji}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "var(--text-base)",
                          color: "var(--header-primary)",
                        }}
                      >
                        {c.label}
                      </div>
                      {c.description && (
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {c.description}
                        </div>
                      )}
                    </div>
                    {selected && (
                      <div
                        style={{ color: "var(--brand-green)", fontWeight: 700 }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {err && (
              <div
                style={{
                  padding: "0 20px 8px",
                  fontSize: "var(--text-sm)",
                  color: "var(--danger)",
                }}
              >
                {err}
              </div>
            )}

            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  background: "transparent",
                  color: "var(--interactive-normal)",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={joinWithClass}
                disabled={pending || !picked}
                style={{
                  marginLeft: "auto",
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "none",
                  background: picked
                    ? "var(--brand-green)"
                    : "var(--bg-modifier-hover)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: picked ? "pointer" : "not-allowed",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending
                  ? "Đang xử lý…"
                  : currentClassKey
                    ? "Đổi class"
                    : "Tham gia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
