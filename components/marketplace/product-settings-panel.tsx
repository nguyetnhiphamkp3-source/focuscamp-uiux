"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { updateProductSettingsAction, deleteProductAction } from "@/app/actions/marketplace";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { FileUploadField } from "@/components/shared/file-upload-field";
import { ConfirmModal } from "@/components/shared/confirm-modal";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

export function ProductSettingsPanel({
  productId,
  communitySlug,
  productSlug,
  initial,
  communityProducts,
  standalone = false,
}: {
  productId: string;
  communitySlug: string;
  productSlug: string;
  initial: {
    title: string;
    description: string | null;
    priceVnd: number;
    priceOldVnd: number | null;
    isVisible: boolean;
    showInCartBump: boolean;
    bumpProductId: string | null;
    upsellProductId: string | null;
    type: string;
    pillar: string | null;
    thumbnailUrl: string | null;
    fileUrl: string | null;
    externalUrl: string | null;
    licenseKeyTemplate: string | null;
  };
  communityProducts: { id: string; title: string; isVisible: boolean }[];
  /** When true, button is always visible (not hover-only). Use on detail pages. */
  standalone?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [priceVnd, setPriceVnd] = useState(initial.priceVnd);
  const [priceOldVnd, setPriceOldVnd] = useState<number | "">(initial.priceOldVnd ?? "");
  const [isVisible, setIsVisible] = useState(initial.isVisible);
  const [showInCartBump, setShowInCartBump] = useState(initial.showInCartBump);
  const [bumpProductId, setBumpProductId] = useState(initial.bumpProductId ?? "");
  const [upsellProductId, setUpsellProductId] = useState(initial.upsellProductId ?? "");
  const [type, setType] = useState(initial.type || "TEMPLATE");
  const [pillar, setPillar] = useState(initial.pillar ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initial.thumbnailUrl);
  const [fileUrl, setFileUrl] = useState<string | null>(initial.fileUrl);
  const [externalUrl, setExternalUrl] = useState(initial.externalUrl ?? "");
  const [licenseKeyTemplate, setLicenseKeyTemplate] = useState(initial.licenseKeyTemplate ?? "FC-{XXXX}-{XXXX}");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) {
      router.refresh();
      setSaved(false);
    }
  }, [saved]);

  function save() {
    setErr(null);
    start(async () => {
      const res = await updateProductSettingsAction({
        productId,
        communitySlug,
        productSlug,
        title: title.trim(),
        description: description.trim() || null,
        priceVnd,
        priceOldVnd: priceOldVnd !== "" ? Number(priceOldVnd) : null,
        isVisible,
        showInCartBump,
        bumpProductId: bumpProductId || null,
        upsellProductId: upsellProductId || null,
        type,
        pillar: pillar.trim() || null,
        thumbnailUrl: thumbnailUrl || null,
        fileUrl: fileUrl || null,
        externalUrl: externalUrl.trim() || null,
        licenseKeyTemplate: type === "LICENSE" ? (licenseKeyTemplate.trim() || null) : null,
      });
      if (res.ok) {
        setOpen(false);
        setSaved(true);
      } else {
        setErr(res.reason);
      }
    });
  }

  function handleDelete() {
    setErr(null);
    start(async () => {
      const res = await deleteProductAction({ productId, communitySlug });
      if (res.ok) {
        setConfirmDelete(false);
        setOpen(false);
        // Navigate away from the (now-gone) detail page or refresh list
        router.push(`/c/${communitySlug}/marketplace`);
        router.refresh();
      } else {
        setErr(res.reason);
        setConfirmDelete(false);
      }
    });
  }

  const otherProducts = communityProducts.filter((p) => p.id !== productId);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        title="Cài đặt sản phẩm"
        style={{
          position: standalone ? "static" : "absolute",
          top: standalone ? undefined : 8,
          right: standalone ? undefined : 8,
          width: 28,
          height: 28,
          borderRadius: 6,
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-floating)",
          color: "var(--interactive-normal)",
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          opacity: 1,
          boxShadow: standalone ? "none" : "0 2px 6px rgba(0,0,0,0.3)",
        }}
        className="product-settings-btn"
      >
        ⚙
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget && !pending) setOpen(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "var(--bg-floating)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border-subtle)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--header-primary)" }}>
              Cài đặt sản phẩm
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              <Field label="Tên sản phẩm *">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={pending} style={inputStyle} />
              </Field>

              <Field label="Mô tả">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={5000} disabled={pending} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </Field>

              <Field label="Ảnh thumbnail">
                <ImageUploadField
                  value={thumbnailUrl}
                  onChange={setThumbnailUrl}
                  context="product"
                  shape="banner"
                  disabled={pending}
                  maxSizeNote="Tối đa 3MB. Tỉ lệ 16:10 cho đẹp."
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Loại">
                  <select value={type} onChange={(e) => setType(e.target.value)} disabled={pending} style={inputStyle}>
                    <option value="TEMPLATE">📝 Template</option>
                    <option value="TOOL">🛠️ Tool</option>
                    <option value="SOP">📋 SOP</option>
                    <option value="BUNDLE">📦 Bundle</option>
                    <option value="PROMPT">💬 Prompt</option>
                    <option value="LICENSE">🔑 License</option>
                  </select>
                </Field>
                <Field label="Pillar">
                  <input type="text" value={pillar} onChange={(e) => setPillar(e.target.value)} maxLength={40} disabled={pending} placeholder="marketing, mindset…" style={inputStyle} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Giá (VND)">
                  <input type="number" value={priceVnd} onChange={(e) => setPriceVnd(Number(e.target.value))} step={1000} min={0} disabled={pending} style={inputStyle} />
                </Field>
                <Field label="Giá cũ (VND, tuỳ chọn)">
                  <input type="number" value={priceOldVnd} onChange={(e) => setPriceOldVnd(e.target.value === "" ? "" : Number(e.target.value))} step={1000} min={0} disabled={pending} placeholder="Để trống nếu không có" style={inputStyle} />
                </Field>
              </div>

              <Field label="Link sản phẩm (Notion/Drive — tuỳ chọn)">
                <input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} disabled={pending} placeholder="https://notion.so/..." style={inputStyle} />
              </Field>

              <Field label="File delivery (PDF/ZIP/video — tuỳ chọn)">
                <FileUploadField
                  value={fileUrl}
                  onChange={setFileUrl}
                  context="product-file"
                  disabled={pending}
                  accept=".pdf,.zip,.docx,.xlsx,.pptx,.mp4,.mov,.mp3,.txt,.csv,.md,application/pdf,application/zip,video/*,audio/*"
                  maxSizeNote="Tối đa 200MB. File chỉ deliver sau khi user mua."
                />
              </Field>

              {type === "LICENSE" && (
                <Field label="License key template">
                  <input type="text" value={licenseKeyTemplate} onChange={(e) => setLicenseKeyTemplate(e.target.value)} maxLength={80} disabled={pending} placeholder="FC-{XXXX}-{XXXX}" style={inputStyle} />
                </Field>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} disabled={pending} />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)" }}>Hiển thị trên marketplace</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={showInCartBump} onChange={(e) => setShowInCartBump(e.target.checked)} disabled={pending} />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)" }}>⚡ Hiện làm bump offer trong giỏ hàng</span>
              </label>

              <Field label="Bump offer (thêm vào checkout)">
                <select value={bumpProductId} onChange={(e) => setBumpProductId(e.target.value)} disabled={pending} style={inputStyle}>
                  <option value="">Không có</option>
                  {otherProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}{!p.isVisible ? " (ẩn)" : ""}</option>
                  ))}
                </select>
              </Field>

              <Field label="Upsell sau mua">
                <select value={upsellProductId} onChange={(e) => setUpsellProductId(e.target.value)} disabled={pending} style={inputStyle}>
                  <option value="">Không có</option>
                  {otherProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}{!p.isVisible ? " (ẩn)" : ""}</option>
                  ))}
                </select>
              </Field>
            </div>

            {err && (
              <div style={{ padding: "0 20px 8px", fontSize: "var(--text-sm)", color: "var(--danger)" }}>
                Lỗi: {err}
              </div>
            )}

            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
              <button type="button" onClick={() => !pending && setConfirmDelete(true)} disabled={pending} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", cursor: "pointer", fontSize: "var(--text-sm)", fontWeight: 600, marginRight: "auto" }}>
                🗑 Xóa
              </button>
              <button type="button" onClick={() => !pending && setOpen(false)} disabled={pending} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--interactive-normal)", cursor: "pointer", fontSize: "var(--text-sm)" }}>
                Huỷ
              </button>
              <button type="button" onClick={save} disabled={pending || !title.trim()} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: title.trim() ? "var(--brand-green)" : "var(--bg-modifier-hover)", color: "#fff", fontWeight: 600, fontSize: "var(--text-sm)", cursor: title.trim() ? "pointer" : "not-allowed", opacity: pending ? 0.6 : 1 }}>
                {pending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Xóa sản phẩm?"
        message={`"${initial.title}" sẽ bị xóa vĩnh viễn cùng tất cả đơn hàng đang chờ thanh toán của nó. Hành động không thể hoàn tác.\n\nNếu đã có người mua (đơn hàng đã thanh toán), thao tác sẽ bị chặn — hãy ẩn sản phẩm thay vì xóa.`}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Huỷ"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
