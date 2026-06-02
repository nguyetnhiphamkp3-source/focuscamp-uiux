"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCouponAction,
  updateCouponAction,
} from "@/app/actions/coupons-admin";

type RefType = "product" | "challenge" | "cart" | "event";

export type EntityOption = { id: string; title: string; searchText?: string };

export type CouponFormInitial = {
  id?: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  percentageBps: number | null;
  maxDiscountVnd: number | null;
  fixedAmountVnd: number | null;
  minOrderVnd: number | null;
  validFrom: string | null; // ISO local or empty
  validUntil: string | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  allowedRefTypes: RefType[];
  allowedProductIds: string[];
  allowedChallengeIds: string[];
  allowedMemberIds: string[];
  isActive: boolean;
};

type Props = {
  communityId: string;
  communitySlug: string;
  products: EntityOption[];
  challenges: EntityOption[];
  members: EntityOption[];
  initial?: CouponFormInitial;
};

const ALL_REF_TYPES: RefType[] = ["product", "challenge", "cart", "event"];

const REF_TYPE_LABEL: Record<RefType, string> = {
  product: "Sản phẩm",
  challenge: "Challenge",
  cart: "Giỏ hàng",
  event: "Sự kiện",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CouponForm({ communityId, communitySlug, products, challenges, members, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState(initial?.code ?? "");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">(
    initial?.discountType ?? "PERCENTAGE",
  );
  const [percentage, setPercentage] = useState<string>(
    initial?.percentageBps != null ? String(initial.percentageBps / 100) : "10",
  );
  const [maxDiscountVnd, setMaxDiscountVnd] = useState<string>(
    initial?.maxDiscountVnd != null ? String(initial.maxDiscountVnd) : "",
  );
  const [fixedAmountVnd, setFixedAmountVnd] = useState<string>(
    initial?.fixedAmountVnd != null ? String(initial.fixedAmountVnd) : "",
  );
  const [minOrderVnd, setMinOrderVnd] = useState<string>(
    initial?.minOrderVnd != null ? String(initial.minOrderVnd) : "",
  );
  const [validFrom, setValidFrom] = useState<string>(toLocalInput(initial?.validFrom ?? null));
  const [validUntil, setValidUntil] = useState<string>(toLocalInput(initial?.validUntil ?? null));
  const [hasExpiry, setHasExpiry] = useState<boolean>(Boolean(initial?.validUntil));
  const [maxRedemptions, setMaxRedemptions] = useState<string>(
    initial?.maxRedemptions != null ? String(initial.maxRedemptions) : "",
  );
  const [perUserLimit, setPerUserLimit] = useState<string>(
    String(initial?.perUserLimit ?? 1),
  );
  const [refTypes, setRefTypes] = useState<RefType[]>(
    initial?.allowedRefTypes ?? ["product"],
  );
  const [productIds, setProductIds] = useState<string[]>(
    initial?.allowedProductIds ?? [],
  );
  const [challengeIds, setChallengeIds] = useState<string[]>(
    initial?.allowedChallengeIds ?? [],
  );
  const [memberIds, setMemberIds] = useState<string[]>(
    initial?.allowedMemberIds ?? [],
  );
  const [memberSpecific, setMemberSpecific] = useState<boolean>(
    (initial?.allowedMemberIds?.length ?? 0) > 0,
  );
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);

  // Targeting only makes sense for product/cart (products) and challenge (challenges).
  const showProductTarget = refTypes.includes("product") || refTypes.includes("cart");
  const showChallengeTarget = refTypes.includes("challenge");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const data = {
      code: code.trim().toUpperCase(),
      discountType,
      percentageBps:
        discountType === "PERCENTAGE" ? Math.round(parseFloat(percentage || "0") * 100) : null,
      maxDiscountVnd:
        discountType === "PERCENTAGE" && maxDiscountVnd ? parseInt(maxDiscountVnd, 10) : null,
      fixedAmountVnd:
        discountType === "FIXED" ? parseInt(fixedAmountVnd || "0", 10) : null,
      minOrderVnd: minOrderVnd ? parseInt(minOrderVnd, 10) : null,
      validFrom: validFrom ? new Date(validFrom).toISOString() : null,
      validUntil: hasExpiry && validUntil ? new Date(validUntil).toISOString() : null,
      maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
      perUserLimit: parseInt(perUserLimit, 10),
      allowedRefTypes: refTypes,
      allowedProductIds: showProductTarget ? productIds : [],
      allowedChallengeIds: showChallengeTarget ? challengeIds : [],
      allowedMemberIds: memberSpecific ? memberIds : [],
      isActive,
    };

    startTransition(async () => {
      const res = initial?.id
        ? await updateCouponAction({
            communityId,
            couponId: initial.id,
            data,
          })
        : await createCouponAction({ communityId, data });
      if (res.ok) {
        router.push(`/c/${communitySlug}/settings/coupons`);
        router.refresh();
      } else {
        setError(res.reason);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <Field label="Mã coupon (in HOA)">
        <input
          required
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="VD: SUMMER20"
          style={inputStyle}
        />
      </Field>

      <Field label="Loại giảm giá">
        <div style={{ display: "flex", gap: 12 }}>
          <label style={radioStyle}>
            <input
              type="radio"
              checked={discountType === "PERCENTAGE"}
              onChange={() => setDiscountType("PERCENTAGE")}
            />
            Phần trăm (%)
          </label>
          <label style={radioStyle}>
            <input
              type="radio"
              checked={discountType === "FIXED"}
              onChange={() => setDiscountType("FIXED")}
            />
            Số tiền cố định (VND)
          </label>
        </div>
      </Field>

      {discountType === "PERCENTAGE" ? (
        <>
          <Field label="Giảm %">
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Tối đa giảm (VND, để trống = không giới hạn)">
            <input
              type="number"
              min="0"
              value={maxDiscountVnd}
              onChange={(e) => setMaxDiscountVnd(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </>
      ) : (
        <Field label="Số tiền giảm (VND)">
          <input
            required
            type="number"
            min="1"
            value={fixedAmountVnd}
            onChange={(e) => setFixedAmountVnd(e.target.value)}
            style={inputStyle}
          />
        </Field>
      )}

      <Field label="Áp dụng cho loại checkout">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {ALL_REF_TYPES.map((t) => (
            <label key={t} style={radioStyle}>
              <input
                type="checkbox"
                checked={refTypes.includes(t)}
                onChange={(e) =>
                  setRefTypes((prev) =>
                    e.target.checked ? [...prev, t] : prev.filter((x) => x !== t),
                  )
                }
              />
              {REF_TYPE_LABEL[t]}
            </label>
          ))}
        </div>
      </Field>

      {showProductTarget && (
        <EntityTargetPicker
          label="Áp dụng cho sản phẩm"
          emptyHint="Cộng đồng chưa có sản phẩm nào."
          options={products}
          selected={productIds}
          onChange={setProductIds}
        />
      )}

      {showChallengeTarget && (
        <EntityTargetPicker
          label="Áp dụng cho challenge"
          emptyHint="Cộng đồng chưa có challenge nào."
          options={challenges}
          selected={challengeIds}
          onChange={setChallengeIds}
        />
      )}

      <MemberTargetPicker
        label="Áp dụng cho thành viên"
        emptyHint="Community chưa có thành viên nào."
        options={members}
        specific={memberSpecific}
        onSpecificChange={setMemberSpecific}
        selected={memberIds}
        onChange={setMemberIds}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16 }}>
        <Field label="Hiệu lực từ (optional)">
          <input
            type="datetime-local"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={radioStyle}>
            <input
              type="checkbox"
              checked={hasExpiry}
              onChange={(e) => {
                setHasExpiry(e.target.checked);
                if (!e.target.checked) setValidUntil("");
              }}
            />
            Đặt ngày hết hạn
          </label>
          {hasExpiry && (
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              style={inputStyle}
            />
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Field label="Tổng lượt dùng tối đa">
          <input
            type="number"
            min="1"
            value={maxRedemptions}
            placeholder="Không giới hạn"
            onChange={(e) => setMaxRedemptions(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Mỗi user dùng tối đa">
          <input
            required
            type="number"
            min="1"
            value={perUserLimit}
            onChange={(e) => setPerUserLimit(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Đơn tối thiểu (VND)">
          <input
            type="number"
            min="0"
            value={minOrderVnd}
            placeholder="Không yêu cầu"
            onChange={(e) => setMinOrderVnd(e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>

      <label style={radioStyle}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Đang hoạt động
      </label>

      {error && (
        <div style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="submit"
          disabled={pending || refTypes.length === 0 || (memberSpecific && memberIds.length === 0)}
          className="ui-btn ui-btn-primary"
          style={{ opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Đang lưu..." : initial?.id ? "Cập nhật" : "Tạo coupon"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/c/${communitySlug}/settings/coupons`)}
          className="ui-btn"
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg-elevated)",
  color: "var(--text-primary)",
  fontSize: "var(--text-base)",
};

const radioStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: "var(--text-sm)",
  cursor: "pointer",
};

/**
 * "Tất cả" / "Cụ thể" toggle + checklist for narrowing a coupon to specific
 * entities. An empty `selected` array means the coupon applies to all entities.
 */
function EntityTargetPicker({
  label,
  emptyHint,
  options,
  selected,
  onChange,
}: {
  label: string;
  emptyHint: string;
  options: EntityOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const specific = selected.length > 0;
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 12, marginBottom: specific ? 8 : 0 }}>
        <label style={radioStyle}>
          <input
            type="radio"
            checked={!specific}
            onChange={() => onChange([])}
          />
          Tất cả
        </label>
        <label style={radioStyle}>
          <input
            type="radio"
            checked={specific}
            disabled={options.length === 0}
            onChange={() => onChange(options[0] ? [options[0].id] : [])}
          />
          Cụ thể
        </label>
      </div>
      {specific &&
        (options.length === 0 ? (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{emptyHint}</div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 200,
              overflowY: "auto",
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--bg-elevated)",
            }}
          >
            {options.map((o) => (
              <label key={o.id} style={radioStyle}>
                <input
                  type="checkbox"
                  checked={selected.includes(o.id)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, o.id]
                        : selected.filter((x) => x !== o.id),
                    )
                  }
                />
                {o.title}
              </label>
            ))}
          </div>
        ))}
    </Field>
  );
}

function MemberTargetPicker({
  label,
  emptyHint,
  options,
  specific,
  onSpecificChange,
  selected,
  onChange,
}: {
  label: string;
  emptyHint: string;
  options: EntityOption[];
  specific: boolean;
  onSpecificChange: (next: boolean) => void;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);
  const normalizedQuery = query.trim().toLowerCase();
  const selectedOptions = selected.map((id) => options.find((o) => o.id === id) ?? { id, title: id });
  const matches = normalizedQuery
    ? options
        .filter(
          (o) =>
            !selectedSet.has(o.id) &&
            (o.searchText ?? o.title).toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 8)
    : [];

  function addMember(id: string) {
    if (!selectedSet.has(id)) onChange([...selected, id]);
    setQuery("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--text-heading)",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: 12, marginBottom: specific ? 8 : 0 }}>
        <label style={radioStyle}>
          <input
            type="radio"
            checked={!specific}
            onChange={() => {
              onSpecificChange(false);
              onChange([]);
              setQuery("");
            }}
          />
          Tất cả
        </label>
        <label style={radioStyle}>
          <input
            type="radio"
            checked={specific}
            disabled={options.length === 0}
            onChange={() => onSpecificChange(true)}
          />
          Cụ thể
        </label>
      </div>

      {specific &&
        (options.length === 0 ? (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{emptyHint}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email"
              style={inputStyle}
            />

            {normalizedQuery && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--bg-elevated)",
                  padding: "var(--space-2)",
                }}
              >
                {matches.length > 0 ? (
                  matches.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => addMember(o.id)}
                      className="ui-btn"
                      style={{
                        justifyContent: "space-between",
                        width: "100%",
                        minHeight: 36,
                        padding: "6px 10px",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.title}
                      </span>
                      <span style={{ color: "var(--brand-green)", fontWeight: 700 }}>Thêm</span>
                    </button>
                  ))
                ) : (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "6px 10px" }}>
                    Không tìm thấy thành viên
                  </div>
                )}
              </div>
            )}

            {selectedOptions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedOptions.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.title}
                    </span>
                    <button
                      type="button"
                      className="ui-btn"
                      onClick={() => onChange(selected.filter((id) => id !== o.id))}
                      style={{ minHeight: 30, padding: "4px 10px" }}
                    >
                      Bỏ
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Chưa chọn thành viên nào.
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--text-heading)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
