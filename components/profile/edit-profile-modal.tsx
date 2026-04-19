"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/user";
import { uploadImage } from "@/lib/upload-client";
import { avatarColorFor, initials } from "@/lib/brand";

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
  communitySlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name ?? "");
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [image, setImage] = useState<string | null>(initial.image);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadImage(file, "avatar");
      setImage(url);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "upload_failed");
    } finally {
      setUploading(false);
    }
  }

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
        router.refresh();
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
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt="avatar"
                      referrerPolicy="no-referrer"
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid var(--border-subtle)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: avatarColorFor(initial.userId),
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "var(--text-lg)",
                      }}
                    >
                      {initials(name || "U")}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      onChange={onPickFile}
                      style={{ display: "none" }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || pending}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--border-subtle)",
                          background: "var(--bg-card)",
                          color: "var(--interactive-normal)",
                          cursor: uploading ? "not-allowed" : "pointer",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        {uploading ? "Đang tải…" : image ? "Đổi ảnh" : "Tải ảnh lên"}
                      </button>
                      {image && (
                        <button
                          type="button"
                          onClick={() => setImage(null)}
                          disabled={uploading || pending}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: "1px solid var(--border-subtle)",
                            background: "transparent",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "var(--text-sm)",
                          }}
                        >
                          Xoá
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      JPG, PNG, WebP, GIF. Tối đa 2MB.
                    </span>
                  </div>
                </div>
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
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
  fontFamily: "inherit",
};
