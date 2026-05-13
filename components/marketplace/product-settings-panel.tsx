"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { updateProductSettingsAction } from "@/app/actions/marketplace";

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
  };
  communityProducts: { id: string; title: string; isVisible: boolean }[];
  /** When true, button is always visible (not hover-only). Use on detail pages. */
  standalone?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [priceVnd, setPriceVnd] = useState(initial.priceVnd);
  const [priceOldVnd, setPriceOldVnd] = useState<number | "">(initial.priceOldVnd ?? "");
  const [isVisible, setIsVisible] = useState(initial.isVisible);
  const [showInCartBump, setShowInCartBump] = useState(initial.showInCartBump);
  const [bumpProductId, setBumpProductId] = useState(initial.bumpProductId ?? "");
  const [upsellProductId, setUpsellProductId] = useState(initial.upsellProductId ?? "");
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
      });
      if (res.ok) {
        setOpen(false);
        setSaved(true);
      } else {
        setErr(res.reason);
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
          opacity: standalone ? 1 : 0,
          transition: "opacity 0.15s",
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Giá (VND)">
                  <input type="number" value={priceVnd} onChange={(e) => setPriceVnd(Number(e.target.value))} step={1000} min={0} disabled={pending} style={inputStyle} />
                </Field>
                <Field label="Giá cũ (VND, tuỳ chọn)">
                  <input type="number" value={priceOldVnd} onChange={(e) => setPriceOldVnd(e.target.value === "" ? "" : Number(e.target.value))} step={1000} min={0} disabled={pending} placeholder="Để trống nếu không có" style={inputStyle} />
                </Field>
              </div>

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

            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
    </>
  );
}
