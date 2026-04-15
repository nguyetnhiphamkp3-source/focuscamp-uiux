export const dynamic = "force-dynamic";

const AGENTS = [
  { icon: "📚", iconCls: "ag-icon-learn", title: "Learning Coach", status: "active", statusLabel: "● Active", desc: "Agent kèm bạn từng bài học, trả lời câu hỏi về nội dung, nhớ lịch sử + tiến độ, gợi ý bài tiếp theo.", chips: ["📚 Khóa học", "💬 Chat", "📱 Telegram"] },
  { icon: "⚔️", iconCls: "ag-icon-challenge", title: "Challenge Coach", status: "active", statusLabel: "● Active", desc: "Theo dõi tiến độ challenge, nhắc deadline, suggest action khi bạn stuck, review evidence trước khi nộp.", chips: ["⚔️ Challenge", "🔥 Streak", "📱 Telegram", "💬 Zalo"] },
  { icon: "👥", iconCls: "ag-icon-community", title: "Community Manager", status: "available", statusLabel: "Available — Admin only", desc: "Cho admin/founder cộng đồng. Điều khiển qua MCP: bulk approve submissions, auto-reply, moderate posts, analytics.", chips: ["🔧 MCP", "🛡️ Admin", "📊 Analytics"] },
  { icon: "🔭", iconCls: "ag-icon-discovery", title: "Discovery Agent", status: "beta", statusLabel: "Beta", desc: "Recommend challenges, courses, communities phù hợp với profile + class + goals của bạn.", chips: ["🔭 Discovery", "🎯 Personalized"] },
  { icon: "💬", iconCls: "ag-icon-support", title: "Support Bot", status: "active", statusLabel: "● Active", desc: "24/7 support qua Telegram/Zalo. Trả lời FAQ, hướng dẫn navigation, escalate tới admin khi cần.", chips: ["🆘 Support", "📱 Telegram", "💬 Zalo"] },
  { icon: "💸", iconCls: "ag-icon-payment", title: "Payment Assistant", status: "beta", statusLabel: "Beta", desc: "Hướng dẫn thanh toán, verify payment receipt, auto-activate subscription sau khi SePay confirm.", chips: ["💸 Payment", "🔐 SePay"] },
];

export default function AgentPage() {
  return (
    <>
      <header className="view-header">
        <span className="view-title">AI Agent Hub</span>
        <span className="view-subtitle">Agents giúp bạn học, ship challenge, quản lý cộng đồng</span>
      </header>
      <div className="ag-view">
        <div className="ag-inner">
          <div className="ag-hero">
            <div className="ag-hero-emoji">🤖</div>
            <div>
              <div className="ag-hero-title">AI Agent as a Service</div>
              <div className="ag-hero-desc">Đây là USP riêng của focus.camp. Agents hiểu context cộng đồng, hỗ trợ 24/7 qua Telegram/Zalo, và giúp creators điều khiển hệ thống qua MCP.</div>
            </div>
          </div>

          <div className="ag-grid">
            {AGENTS.map((a) => (
              <div key={a.title} className="ag-card">
                <div className="ag-card-head">
                  <div className={`ag-card-icon ${a.iconCls}`}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="ag-card-title">{a.title}</div>
                    <span className={`ag-card-status ${a.status}`}>{a.statusLabel}</span>
                  </div>
                </div>
                <div className="ag-card-desc">{a.desc}</div>
                <div className="ag-card-meta">
                  {a.chips.map((c) => (
                    <span key={c} className="ag-chip">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="dc-section-head" style={{ marginTop: 32 }}>
            <h2>💬 Thử trò chuyện với Learning Coach</h2>
          </div>
          <div className="ag-chat">
            <div className="ag-chat-head">
              <div className="ag-chat-avatar">📚</div>
              <div>
                <div className="ag-chat-name">Learning Coach</div>
                <div className="ag-chat-status">● Online · Context: Foundations course</div>
              </div>
            </div>
            <div className="ag-chat-body">
              <div className="ag-msg agent">Chào! Mình là Learning Coach. Bạn cần giúp gì về khóa học nào?</div>
            </div>
            <div className="ag-chat-input-wrap">
              <input type="text" className="ag-chat-input" placeholder="Hỏi Learning Coach điều gì đó..." />
              <button className="ag-chat-send">Gửi</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
