"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/user";
import { ImageUploadField } from "@/components/shared/image-upload-field";

export function EditProfileButton({
  initial,
  communitySlug,
}: {
  initial: {
    name: string | null;
    handle: string | null;
    bio: string | null;
    location: string | null;
    image: string | null;
    userId: string;
  };
  /** Optional: only used to revalidate a community-scoped profile page.
   * Omit on the global /u/[handle] page (router.refresh handles it). */
  communitySlug?: string;
}) {
  const router = useRouter();
  const initialProfilePath = `/u/${encodeURIComponent(initial.handle ?? initial.userId)}`;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name ?? "");
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [image, setImage] = useState<string | null>(initial.image);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await updateProfileAction({
        name: name.trim() || undefined,
        handle: handle.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        image: image ?? "",
        communitySlug,
      });
      if (res.ok) {
        setOpen(false);
        if (communitySlug) {
          router.refresh();
        } else if (res.profilePath !== initialProfilePath) {
          router.replace(res.profilePath);
        } else {
          router.refresh();
        }
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="ui-btn ui-btn-primary ui-btn-sm"
        onClick={() => setOpen(true)}
      >
        Edit profile
      </button>

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
              maxWidth: 560,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--header-primary)",
              }}
            >
              Sửa profile
            </div>

            <div
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                overflowY: "auto",
              }}
            >
              <Field label="Ảnh đại diện">
                <ImageUploadField
                  value={image}
                  onChange={setImage}
                  context="avatar"
                  shape="circle"
                  disabled={pending}
                  maxSizeNote="Tối đa 2MB"
                />
              </Field>

              <Field label="Tên hiển thị">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  disabled={pending}
                  style={inputStyle}
                  placeholder="Nguyễn Văn A"
                />
              </Field>

              <Field
                label="Handle (username duy nhất)"
                hint="Dùng trong URL + mention. Chỉ a-z, 0-9, -, _"
              >
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  maxLength={30}
                  disabled={pending}
                  style={inputStyle}
                  placeholder="nghia"
                />
              </Field>

              <Field label="Bio" hint={`${bio.length}/500`}>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={pending}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                    minHeight: 70,
                  }}
                  placeholder="Giới thiệu bản thân trong vài dòng…"
                />
              </Field>

              <Field label="Location">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={100}
                  disabled={pending}
                  style={inputStyle}
                  placeholder="Hà Nội, Việt Nam"
                />
              </Field>
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
                onClick={submit}
                disabled={pending}
                style={{
                  marginLeft: "auto",
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--brand-green)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {label}
        </span>
        {hint && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "rgba(0,0,0,0.04)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
  fontFamily: "inherit",
};
