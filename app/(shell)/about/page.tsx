export const metadata = {
  title: "Về focus.camp",
  description:
    "Cộng đồng được đặt tên từ hai từ cổ đại — Focus và Camp — và trong sự giao thoa đó là toàn bộ triết lý của chúng tôi.",
};

const PRINCIPLES = [
  {
    title: "Vòng tròn, không phải sân khấu",
    body: "Không ai nói cao hơn ai. Người có 10 năm kinh nghiệm và người mới đều cùng một vòng lửa.",
  },
  {
    title: "Chuyện thật, không phải content",
    body: 'Ở đây bạn nói những thứ không đăng lên LinkedIn. Sự thất bại, nỗi sợ, câu hỏi chưa có đáp án.',
  },
  {
    title: "Hiện diện, không phải networking",
    body: "Bạn không đến để trao đổi danh thiếp. Bạn đến để thực sự ngồi với người khác — như loài người đã làm từ trước khi có chữ viết.",
  },
  {
    title: "Lửa ấm, không phải decor",
    body: 'Focus.Camp không giống những "aesthetic campfire". Lửa ở đây là triết học — sự ấm áp, sự tập trung, và sức hút tự nhiên kéo người lại gần nhau.',
  },
];

const DOS_DONTS = [
  {
    do: '"Tối thứ Sáu — vòng tròn mở. Có chỗ trống nếu bạn muốn ngồi."',
    dont: '"ĐĂNG KÝ NGAY! Sự kiện networking HOT nhất tháng này!"',
  },
  {
    do: '"Focus.Camp là nơi người ta kể những chuyện chưa bao giờ kể."',
    dont: '"Platform kết nối cộng đồng sáng tạo năng động và đổi mới!"',
  },
];

export default function AboutPage() {
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "var(--space-16) var(--space-6) var(--space-16)",
        }}
      >
        {/* HERO */}
        <header style={{ marginBottom: "var(--space-16)" }}>
          <Label>Giới thiệu</Label>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: "var(--fw-regular)",
              fontSize: "var(--text-3xl)",
              lineHeight: "var(--lh-snug)",
              color: "var(--text-heading)",
              marginBottom: "var(--space-4)",
            }}
          >
            Cộng đồng được đặt tên từ hai từ cổ đại — và trong sự giao thoa đó
            là toàn bộ triết lý của chúng tôi.
          </h1>
          <div style={{ fontSize: 32 }}>🏕️🔥</div>
        </header>

        {/* NAME */}
        <Section label="Tên & ý nghĩa">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--space-8)",
            }}
          >
            <WordOrigin
              word="Focus"
              origin="Latin cổ đại"
              body={
                <>
                  Nghĩa gốc là <em>bếp lửa</em>, trung tâm của ngôi nhà La Mã.
                  Hàng nghìn năm sau, tiếng Anh mượn nó với nghĩa &ldquo;điểm
                  tập trung.&rdquo; Chúng tôi trả nó về nghĩa đầu tiên.
                </>
              }
            />
            <WordOrigin
              word="Camp"
              origin="Latin — Campus"
              body={
                <>
                  Khoảng trống, bãi đất trống — nơi người ta dựng lều, nhóm lửa,
                  ngồi lại. Không phải toà nhà, không phải tổ chức. Chỉ là một
                  khoảng trời và những người chọn ở lại.
                </>
              }
            />
          </div>
        </Section>

        {/* MANIFESTO */}
        <Section label="Manifesto">
          <blockquote
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-xl)",
              lineHeight: "var(--lh-relaxed)",
              color: "var(--text-heading)",
              borderLeft: "2px solid var(--brand-green)",
              paddingLeft: "var(--space-5)",
            }}
          >
            <p style={{ marginBottom: "var(--space-4)" }}>
              Trước khi có thành phố, trước khi có tôn giáo, trước khi có ngôn
              ngữ viết — <em style={{ color: "var(--brand-green)" }}>đã có lửa.</em>
            </p>
            <p style={{ marginBottom: "var(--space-4)" }}>
              Và xung quanh lửa đó, người ta ngồi lại. Không phải vì họ phải
              ngồi. Mà vì{" "}
              <em style={{ color: "var(--brand-green)" }}>lửa kéo người đến.</em>
            </p>
            <p>
              Focus.Camp không phát minh ra thứ gì mới. Chúng tôi chỉ{" "}
              <em style={{ color: "var(--brand-green)" }}>giữ lửa.</em>
            </p>
          </blockquote>
        </Section>

        {/* PRINCIPLES */}
        <Section label="Nguyên tắc cộng đồng">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
            }}
          >
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.title}
                style={{
                  display: "flex",
                  gap: "var(--space-4)",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-xl)",
                    fontWeight: "var(--fw-regular)",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                    width: 28,
                    lineHeight: 1.2,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "var(--text-md)",
                      fontWeight: "var(--fw-bold)",
                      color: "var(--text-heading)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--text-normal)",
                      lineHeight: "var(--lh-relaxed)",
                      fontSize: "var(--text-base)",
                    }}
                  >
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* DO / DON'T */}
        <Section label="Giọng điệu">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            {DOS_DONTS.flatMap((row, i) => [
              <ToneCard key={`do-${i}`} kind="do" text={row.do} />,
              <ToneCard key={`dont-${i}`} kind="dont" text={row.dont} />,
            ])}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "var(--text-xs)",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: "var(--fw-semibold)",
        marginBottom: "var(--space-5)",
      }}
    >
      {children}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "var(--space-16)" }}>
      <Label>{label}</Label>
      {children}
    </section>
  );
}

function WordOrigin({
  word,
  origin,
  body,
}: {
  word: string;
  origin: string;
  body: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--fw-semibold)",
          color: "var(--text-heading)",
          lineHeight: "var(--lh-tight)",
          marginBottom: "var(--space-1)",
        }}
      >
        {word}
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "var(--space-3)",
          fontWeight: "var(--fw-semibold)",
        }}
      >
        {origin}
      </div>
      <p
        style={{
          color: "var(--text-normal)",
          lineHeight: "var(--lh-relaxed)",
          fontSize: "var(--text-base)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function ToneCard({ kind, text }: { kind: "do" | "dont"; text: string }) {
  const isDo = kind === "do";
  return (
    <div
      style={{
        padding: "var(--space-5)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${isDo ? "var(--brand-green)" : "var(--border-strong)"}`,
      }}
    >
      <div
        style={{
          fontSize: "var(--text-xs)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: isDo ? "var(--brand-green-dark)" : "var(--text-muted)",
          fontWeight: "var(--fw-bold)",
          marginBottom: "var(--space-3)",
        }}
      >
        {isDo ? "Nên" : "Tránh"}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          color: isDo ? "var(--text-heading)" : "var(--text-muted)",
          lineHeight: "var(--lh-relaxed)",
          fontSize: "var(--text-base)",
        }}
      >
        {text}
      </div>
    </div>
  );
}
