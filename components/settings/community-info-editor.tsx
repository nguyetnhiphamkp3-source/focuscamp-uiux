"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCommunityInfoAction } from "@/app/actions/community";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import {
  inputStyle,
  btnPrimary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

export function CommunityInfoEditor({
  communityId,
  communitySlug,
  initial,
  disabled = false,
}: {
  communityId: string;
  communitySlug: string;
  initial: {
    name: string;
    tagline: string | null;
    description: string | null;
    bannerUrl: string | null;
    iconUrl: string | null;
  };
  disabled?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl ?? "");
  const [iconUrl, setIconUrl] = useState(initial.iconUrl ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateCommunityInfoAction({
        communityId,
        communitySlug,
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        bannerUrl: bannerUrl.trim(),
        iconUrl: iconUrl.trim(),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)", opacity: disabled ? 0.5 : 1 }}
    >
      <SectionHeader
        title="Thông tin cộng đồng"
        subtitle="Tên, tagline, mô tả, banner, icon hiển thị cho thành viên + Discovery."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Tên *
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            disabled={disabled || pending}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Tagline (1 câu — dưới tên cộng đồng)
          </span>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={160}
            disabled={disabled || pending}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Mô tả chi tiết
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={5000}
            disabled={disabled || pending}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Banner (1600×600 khuyến nghị)
            </span>
            <ImageUploadField
              value={bannerUrl || null}
              onChange={(url) => setBannerUrl(url ?? "")}
              context="community"
              shape="banner"
              disabled={disabled || pending}
              maxSizeNote="Tối đa 5MB"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Icon (vuông, 256×256)
            </span>
            <ImageUploadField
              value={iconUrl || null}
              onChange={(url) => setIconUrl(url ?? "")}
              context="community"
              shape="square"
              disabled={disabled || pending}
              maxSizeNote="Tối đa 5MB"
            />
          </div>
        </div>
      </div>

      {!disabled && (
        <div style={{ display: "flex", marginTop: 12 }}>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !name.trim()}
            style={{
              ...btnPrimary,
              marginLeft: "auto",
              opacity: pending || !name.trim() ? 0.6 : 1,
              cursor: pending || !name.trim() ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "Đang lưu…" : "Lưu thông tin"}
          </button>
        </div>
      )}

      <ErrorBox msg={err} />
      <SuccessBox shown={saved} />
    </section>
  );
}
