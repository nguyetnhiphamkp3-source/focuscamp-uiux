import { EmptyState } from "@/components/ui/empty-state";

export default function SignalsPage() {
  return (
    <>
      <header className="view-header">
        <span className="view-title">Tín hiệu</span>
        <span className="view-subtitle">
          Insight nhanh, trend, cơ hội mới từ cộng đồng
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
            icon="⚡"
            title="Tín hiệu — Market pulse"
            description="Module đang hoàn thiện. AI Agent sẽ tổng hợp tín hiệu mới mỗi ngày ở đây."
          />
        </div>
      </div>
    </>
  );
}
