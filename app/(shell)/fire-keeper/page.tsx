import Link from "next/link";

export const metadata = {
  title: "Fire Keeper — focus.camp",
  description:
    "Người giữ lửa không phải người to mồm nhất. Họ là người ở lại khi lửa gần tắt.",
};

const LEVELS = [
  {
    n: "01",
    title: "Spark",
    vn: "Tia lửa",
    body: "Bạn có ý tưởng. Bạn tin vào một điều gì đó. Nhưng lửa chưa có tên, chưa có người quây quần.",
  },
  {
    n: "02",
    title: "Ember",
    vn: "Than hồng",
    body: "Lửa đã cháy — nhỏ nhưng bền. Có người đầu tiên ngồi xuống. Cộng đồng đang thành hình.",
  },
  {
    n: "03",
    title: "Flame",
    vn: "Ngọn lửa",
    body: "Lửa có sức kéo. Người ta tự tìm đến. Bạn không còn phải gọi — họ đến vì muốn đến.",
  },
  {
    n: "04",
    title: "Bonfire",
    vn: "Đống lửa",
    body: "Nhiều người — nhiều vòng tròn. Bạn không còn là người duy nhất giữ lửa. Bạn đã đào tạo được người kế.",
  },
  {
    n: "05",
    title: "Fire Keeper",
    vn: "Người giữ lửa",
    body: "Lửa của bạn trở thành văn hóa. Nó tồn tại dù bạn có mặt hay không. Đó là di sản.",
  },
];

const TRUTHS = [
  {
    title: "Lửa không tự cháy",
    body: "Mọi cộng đồng đều bắt đầu bằng một người — một người chịu đứng giữa trời tối và nói: 'Chúng ta ngồi lại đây.' Đó là bạn.",
  },
  {
    title: "Giữ lửa là kỷ luật, không phải cảm hứng",
    body: "Không phải ngày nào bạn cũng muốn. Có ngày không ai đến. Có tuần bạn nghi ngờ tất cả. Fire Keeper không phải người không bao giờ mệt — họ là người tiếp tục dù mệt.",
  },
  {
    title: "Cộng đồng không cần người hoàn hảo — cần người thật",
    body: "Người ta không ngồi quanh lửa vì lửa đẹp. Họ ngồi vì ấm. Sự thật của bạn — kể cả vết thương — chính là nhiên liệu.",
  },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "var(--text-xs)",
        fontWeight: 700,
        color: "var(--brand-green)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: "var(--space-3)",
      }}
    >
      {children}
    </div>
  );
}

export default function FireKeeperPage() {
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "var(--space-16) var(--space-6) var(--space-20)",
        }}
      >
        {/* HERO */}
        <header style={{ marginBottom: "var(--space-16)" }}>
          <Label>Fire Keeper</Label>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "var(--text-3xl)",
              lineHeight: "var(--lh-snug)",
              color: "var(--text-heading)",
              marginBottom: "var(--space-6)",
            }}
          >
            Người không để lửa tắt.
          </h1>
          <p
            style={{
              fontSize: "var(--text-lg)",
              color: "var(--text-muted)",
              lineHeight: "var(--lh-relaxed)",
              maxWidth: 580,
            }}
          >
            Mọi cộng đồng thật sự đều có một người — người không phải là người nổi tiếng nhất, không phải người nói nhiều nhất. Họ là người ở lại khi lửa gần tắt. Người đó được gọi là{" "}
            <strong style={{ color: "var(--text-heading)" }}>Fire Keeper</strong>.
          </p>
        </header>

        {/* TRUTHS */}
        <section style={{ marginBottom: "var(--space-16)" }}>
          <Label>Triết lý</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            {TRUTHS.map((t) => (
              <div key={t.title}>
                <h3
                  style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: 700,
                    color: "var(--text-heading)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {t.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--text-base)",
                    color: "var(--text-muted)",
                    lineHeight: "var(--lh-relaxed)",
                  }}
                >
                  {t.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* LEVELS */}
        <section style={{ marginBottom: "var(--space-16)" }}>
          <Label>5 cấp độ</Label>
          <h2
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--text-heading)",
              marginBottom: "var(--space-8)",
            }}
          >
            Con đường trở thành Fire Keeper
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {LEVELS.map((l, i) => (
              <div
                key={l.n}
                style={{
                  display: "flex",
                  gap: "var(--space-5)",
                  padding: "var(--space-5)",
                  background: i === 4 ? "rgba(27,158,117,0.08)" : "var(--bg-card)",
                  border: `1px solid ${i === 4 ? "var(--brand-green)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--r-lg)",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 700,
                    color: i === 4 ? "var(--brand-green)" : "var(--text-muted)",
                    letterSpacing: "0.08em",
                    minWidth: 28,
                    paddingTop: 2,
                  }}
                >
                  {l.n}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                    <span style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--text-heading)" }}>
                      {l.title}
                    </span>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                      — {l.vn}
                    </span>
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: "var(--lh-relaxed)", margin: 0 }}>
                    {l.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* THE CHALLENGE */}
        <section
          style={{
            padding: "var(--space-8)",
            background: "linear-gradient(135deg, rgba(27,158,117,0.1), rgba(240,179,50,0.08))",
            border: "1px solid rgba(27,158,117,0.3)",
            borderRadius: "var(--r-lg)",
            marginBottom: "var(--space-16)",
          }}
        >
          <Label>Chương trình</Label>
          <h2
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 800,
              color: "var(--text-heading)",
              marginBottom: "var(--space-3)",
              fontFamily: "var(--font-heading)",
            }}
          >
            The Challenge Creator&apos;s Challenge
          </h2>
          <p
            style={{
              fontSize: "var(--text-base)",
              color: "var(--text-muted)",
              lineHeight: "var(--lh-relaxed)",
              marginBottom: "var(--space-6)",
            }}
          >
            Bạn không thể dạy người khác vượt qua thử thách nếu bạn chưa từng làm điều đó với chính mình.
            Đây là chương trình rèn luyện dành riêng cho những người muốn trở thành Fire Keeper —
            người tạo ra thử thách, không phải người chỉ tham gia thử thách.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "var(--space-3)",
              marginBottom: "var(--space-6)",
            }}
          >
            {[
              ["🔥", "Tự thiết kế challenge đầu tiên của bạn"],
              ["⚔️", "Hoàn thành nó trước khi dạy người khác"],
              ["👥", "Xây dựng vòng tròn đầu tiên"],
              ["📐", "Học cách đo lường & cải thiện"],
            ].map(([icon, text]) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-body)",
                  alignItems: "flex-start",
                }}
              >
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <Link
            href="/discovery"
            className="ui-btn ui-btn-primary"
            style={{ display: "inline-block", textDecoration: "none" }}
          >
            Khám phá cộng đồng →
          </Link>
        </section>

        {/* FOOTER QUOTE */}
        <footer
          style={{
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "var(--space-8)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-lg)",
              color: "var(--text-muted)",
              lineHeight: "var(--lh-relaxed)",
            }}
          >
            &ldquo;Lửa không cần được giải thích. Nó chỉ cần được giữ.&rdquo;
          </p>
          <div style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            🔥🏕️ focus.camp
          </div>
        </footer>
      </div>
    </div>
  );
}
