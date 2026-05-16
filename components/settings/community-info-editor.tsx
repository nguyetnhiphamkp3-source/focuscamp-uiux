"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateCommunityInfoAction } from "@/app/actions/community";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { uploadImage } from "@/lib/upload-client";
import { COMMUNITY_CATEGORIES } from "@/lib/community-categories";
import {
  inputStyle,
  btnPrimary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

type GalleryItem = { type: "video" | "image"; url: string };

function detectType(url: string): "video" | "image" {
  return /youtube\.com|youtu\.be|loom\.com/.test(url) ? "video" : "image";
}

function parseInitialGallery(raw: unknown, introVideoUrl?: string | null): GalleryItem[] {
  const items: GalleryItem[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "object" && item !== null && "url" in item && typeof (item as GalleryItem).url === "string") {
        const gi = item as GalleryItem;
        if (!seen.has(gi.url)) { seen.add(gi.url); items.push({ type: gi.type || "video", url: gi.url }); }
      }
    }
  }
  if (introVideoUrl && !seen.has(introVideoUrl)) {
    items.unshift({ type: "video", url: introVideoUrl });
  }
  return items;
}

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
    category: string | null;
    featuredOnGlobal: boolean;
    bannerUrl: string | null;
    iconUrl: string | null;
    introVideoUrl?: string | null;
    introGallery?: unknown;
  };
  disabled?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [featuredOnGlobal, setFeaturedOnGlobal] = useState(initial.featuredOnGlobal);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl ?? "");
  const [iconUrl, setIconUrl] = useState(initial.iconUrl ?? "");
  const [gallery, setGallery] = useState<GalleryItem[]>(() =>
    parseInitialGallery(initial.introGallery, initial.introVideoUrl)
  );
  const [newUrl, setNewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function addGalleryItem() {
    const url = newUrl.trim();
    if (!url || gallery.some(i => i.url === url)) return;
    setGallery(prev => [...prev, { type: detectType(url), url }]);
    setNewUrl("");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "community");
      setGallery(prev => [...prev, { type: "image", url }]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload thất bại");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeGalleryItem(index: number) {
    setGallery(prev => prev.filter((_, i) => i !== index));
  }

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const firstVideo = gallery.find(i => i.type === "video");
      const res = await updateCommunityInfoAction({
        communityId,
        communitySlug,
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category: category || null,
        featuredOnGlobal,
        bannerUrl: bannerUrl.trim(),
        iconUrl: iconUrl.trim(),
        introVideoUrl: firstVideo?.url ?? "",
        introGallery: gallery,
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

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Category Discovery
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={disabled || pending}
            style={inputStyle}
          >
            <option value="">Chưa chọn</option>
            {COMMUNITY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: "8px 12px",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            background: "var(--bg-card)",
            cursor: disabled || pending ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={featuredOnGlobal}
            onChange={(e) => setFeaturedOnGlobal(e.target.checked)}
            disabled={disabled || pending}
            style={{ marginTop: 3 }}
          />
          <div>
            <div
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--header-primary)",
              }}
            >
              Hiện trên Discovery
            </div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              Khi bật, cộng đồng này được ưu tiên trong Featured Communities.
            </div>
          </div>
        </label>

        {/* Gallery — videos + images for intro page */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
            Gallery giới thiệu (YouTube, Loom, hoặc URL ảnh)
          </span>
          {gallery.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {gallery.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", width: 36, flexShrink: 0 }}>
                    {item.type === "video" ? "🎬" : "🖼"} #{i + 1}
                  </span>
                  <input
                    type="url"
                    value={item.url}
                    onChange={(e) => {
                      const url = e.target.value;
                      setGallery(prev => prev.map((it, idx) => idx === i ? { type: detectType(url), url } : it));
                    }}
                    disabled={disabled || pending}
                    style={{ ...inputStyle, flex: 1, fontSize: "var(--text-xs)" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryItem(i)}
                    disabled={disabled || pending}
                    style={{ border: "none", background: "none", color: "var(--danger)", cursor: "pointer", padding: "0 4px", fontSize: 16 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGalleryItem())}
              placeholder="YouTube / Loom URL…"
              disabled={disabled || pending || uploading}
              style={{ ...inputStyle, flex: 1, fontSize: "var(--text-xs)" }}
            />
            <button
              type="button"
              onClick={addGalleryItem}
              disabled={disabled || pending || uploading || !newUrl.trim()}
              style={{ ...btnPrimary, padding: "0 12px", fontSize: "var(--text-xs)", opacity: !newUrl.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}
            >
              + Video
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || pending || uploading}
              style={{ ...btnPrimary, padding: "0 12px", fontSize: "var(--text-xs)", background: "var(--bg-elevated)", color: "var(--text-normal)", border: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}
            >
              {uploading ? "Đang tải…" : "📷 Tải ảnh"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </div>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Item đầu tiên = video/ảnh chính. Thêm nhiều để tạo slideshow.
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Banner (1600×900 / 16:9 khuyến nghị)
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
