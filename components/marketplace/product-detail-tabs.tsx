"use client";

import { useState } from "react";

type Tab = "description" | "included" | "audience";

const TABS: { key: Tab; label: string }[] = [
  { key: "description", label: "Mô tả ngắn" },
  { key: "included", label: "Sản phẩm" },
  { key: "audience", label: "Đối tượng" },
];

export function ProductDetailTabs({ description }: { description?: string | null }) {
  const [tab, setTab] = useState<Tab>("description");

  return (
    <div className="ui-card" style={{ marginBottom: "var(--space-4)", padding: 0, overflow: "hidden" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "0 4px" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="detail-tab"
            onClick={() => setTab(t.key)}
            style={{
              padding: "12px 14px",
              border: "none",
              borderRadius: 0,
              background: "none",
              fontSize: "var(--text-sm)",
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? "#1B9E75" : "var(--text-muted)",
              borderBottom: `2px solid ${tab === t.key ? "#1B9E75" : "transparent"}`,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px" }}>
        {tab === "description" && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", lineHeight: 1.7, margin: 0 }}>
            {description || "Chưa có mô tả."}
          </p>
        )}

        {tab === "included" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "File tài liệu định dạng Notion / PDF",
              "Hướng dẫn sử dụng từng bước",
              "Template có thể duplicate và chỉnh sửa ngay",
              "Cập nhật miễn phí trong tương lai",
              "Hỗ trợ qua cộng đồng focus.camp",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "var(--text-sm)", color: "var(--text-normal)" }}>
                <span style={{ color: "#1B9E75", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
        )}

        {tab === "audience" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Người mới bắt đầu muốn có hệ thống rõ ràng từ đầu",
              "Digital creator đang tìm framework tăng trưởng",
              "Người muốn tiết kiệm thời gian với template có sẵn",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "var(--text-sm)", color: "var(--text-normal)" }}>
                <span style={{ color: "#1B9E75", flexShrink: 0, marginTop: 1 }}>→</span>
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
