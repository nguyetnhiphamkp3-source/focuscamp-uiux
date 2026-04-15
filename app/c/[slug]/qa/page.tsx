import { EmptyState } from "@/components/ui/empty-state";

export default function QAPage() {
  return (
    <>
      <header className="view-header">
        <span className="view-title">Hỏi đáp</span>
        <span className="view-subtitle">
          Đặt câu hỏi, nhận câu trả lời từ cộng đồng + AI
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
            icon="❓"
            title="Hỏi đáp"
            description="Module đang hoàn thiện. Sẽ sớm cho phép post câu hỏi + AI Agent trả lời tự động."
          />
        </div>
      </div>
    </>
  );
}
