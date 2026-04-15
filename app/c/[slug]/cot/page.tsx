import { EmptyState } from "@/components/ui/empty-state";

export default function CotPage() {
  return (
    <>
      <header className="view-header">
        <span className="view-title">CỐT</span>
        <span className="view-subtitle">
          Các bài viết cốt lõi, đỉnh cao từ cộng đồng
        </span>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-10) var(--space-6)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EmptyState
            icon="⭐"
            title="CỐT — Top quality posts"
            description="Module đang hoàn thiện. Các bài CỐT sẽ xuất hiện ở đây khi admin đánh dấu từ Bảng tin."
          />
        </div>
      </div>
    </>
  );
}
