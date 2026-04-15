export const dynamic = "force-dynamic";

const POSTS = [
  {
    id: 1,
    author: "Thieu",
    avatarColor: "linear-gradient(135deg,#e67e22,#d35400)",
    nameColor: "#c26a15",
    classTag: "🎯 Hustler",
    lv: 52,
    time: "2 giờ trước",
    pillarTag: "🎯 Offer",
    pillarCls: "pillar-offer",
    title: "Cách tôi scale offer từ 30tr lên 300tr/tháng trong 90 ngày",
    body: "Sau 18 tháng loay hoay với nhiều offer khác nhau, tôi nhận ra một thứ: offer không phải là product. Offer là cách bạn đóng gói value promise + risk reversal + urgency để khách mua ngay.",
    likes: 142,
    comments: 38,
    isCot: false,
  },
  {
    id: 2,
    author: "Kan the Elf",
    avatarColor: "linear-gradient(135deg,#1abc9c,#16a085)",
    nameColor: "#1a8a72",
    classTag: "🧠 Strategist",
    lv: 44,
    time: "hôm qua",
    pillarTag: "🚚 Delivery",
    pillarCls: "pillar-delivery",
    title: "Framework 3-30-300 để hệ thống hoá delivery khi scale team",
    body: "Khi business chuyển từ solo → team 3 → team 10, bottleneck luôn là delivery. Framework 3-30-300: Quy trình 3 phút · SOP 30s · KPI 300ms.",
    likes: 287,
    comments: 64,
    isCot: true,
  },
  {
    id: 3,
    author: "Dan Tech",
    avatarColor: "linear-gradient(135deg,#2ecc71,#27ae60)",
    nameColor: "#2d8a4e",
    classTag: "⚔️ Engineer",
    lv: 41,
    time: "2 ngày trước",
    pillarTag: "⚡ Conversion",
    pillarCls: "pillar-conversion",
    title: "Audit 10 landing pages và 3 bug conversion phổ biến",
    body: "Tuần rồi audit 10 landing của members. 3 bug xuất hiện nhiều nhất: form 8+ fields, CTA không rõ benefit, social proof yếu.",
    likes: 89,
    comments: 22,
    isCot: false,
  },
];

export default function FeedPage() {
  return (
    <>
      <header className="view-header">
        <span className="view-title">Bảng tin</span>
        <span className="view-subtitle">Chia sẻ kinh nghiệm, ý tưởng, và insight</span>
      </header>
      <div className="feed-view">
        <div className="feed-inner">
          <div className="feed-compose">
            <div className="feed-compose-avatar">?</div>
            <div className="feed-compose-input">Chia sẻ điều gì đó với cộng đồng...</div>
          </div>

          <div className="feed-tabs">
            <div className="feed-tab active">Latest</div>
            <div className="feed-tab">Popular</div>
            <div className="feed-tab">Following</div>
            <div className="feed-tab">Bookmarked</div>
          </div>

          <div className="feed-pillars">
            <div className="feed-pillar-pill active">Tất cả Pillars</div>
            <div className="feed-pillar-pill">🎯 Offer</div>
            <div className="feed-pillar-pill">📣 Traffic</div>
            <div className="feed-pillar-pill">⚡ Conversion</div>
            <div className="feed-pillar-pill">🚚 Delivery</div>
          </div>

          {POSTS.map((p) => (
            <div key={p.id} className={`feed-post${p.isCot ? " cot-post" : ""}`}>
              <div className="feed-post-head">
                <div className="feed-post-avatar" style={{ background: p.avatarColor }}>
                  {p.author[0]}
                </div>
                <div className="feed-post-author-wrap">
                  <div className="feed-post-author">
                    <span style={{ color: p.nameColor }}>{p.author}</span>
                    <span className="class-tag">{p.classTag}</span>
                    <span className="lv-tag">Lv {p.lv}</span>
                  </div>
                  <div className="feed-post-time">
                    {p.time}
                    {p.isCot && (
                      <>
                        {" · "}
                        <span style={{ color: "var(--premium-gold)", fontWeight: 700 }}>⭐ CỐT</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`feed-post-pillar-tag ${p.pillarCls}`}>{p.pillarTag}</span>
              </div>
              <div className="feed-post-title">{p.title}</div>
              <div className="feed-post-body">{p.body}</div>
              <div className="feed-post-actions">
                <button className="feed-post-action">❤️ {p.likes}</button>
                <button className="feed-post-action">💬 {p.comments} comments</button>
                <button className="feed-post-action">🔖 Bookmark</button>
                <button className="feed-post-action" style={{ marginLeft: "auto" }}>🔗 Share</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
