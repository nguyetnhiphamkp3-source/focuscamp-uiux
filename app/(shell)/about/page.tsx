export const metadata = {
  title: "Về focus.camp — Triết lý & Nguyên tắc",
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
    body: "Ở đây bạn nói những thứ không đăng lên LinkedIn. Sự thất bại, nỗi sợ, câu hỏi chưa có đáp án.",
  },
  {
    title: "Hiện diện, không phải networking",
    body: "Bạn không đến để trao đổi danh thiếp. Bạn đến để thực sự ngồi với người khác — như loài người đã làm từ trước khi có chữ viết.",
  },
  {
    title: "Lửa ấm, không phải decor",
    body: "Focus.Camp không giống những \"aesthetic campfire\". Lửa ở đây là triết học — sự ấm áp, sự tập trung, và sức hút tự nhiên kéo người lại gần nhau.",
  },
];

const DOS_DONTS: { do: string; dont: string }[] = [
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
      {/* HERO */}
      <section
        style={{
          background: "var(--bg-card)",
          padding: "var(--space-16) var(--space-8) var(--space-12)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-md" style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "var(--text-xs)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "var(--space-6)",
              fontWeight: "var(--fw-medium)",
            }}
          >
            Giới thiệu
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: "var(--text-4xl)",
              lineHeight: "var(--lh-tight)",
              fontWeight: "var(--fw-regular)",
              fontStyle: "italic",
              marginBottom: "var(--space-5)",
              color: "var(--text-heading)",
            }}
          >
            Cộng đồng được đặt tên từ hai từ cổ đại —
            <br />
            và trong sự giao thoa đó là toàn bộ triết lý của chúng tôi.
          </h1>
          <div style={{ fontSize: 40, marginTop: "var(--space-6)" }}>🏕️🔥</div>
        </div>
      </section>

      {/* NAME & MEANING */}
      <section style={{ padding: "var(--space-12) var(--space-8)" }}>
        <div className="container-lg">
          <SectionLabel>Tên &amp; Ý nghĩa</SectionLabel>
          <div
            className="ui-card ui-card-lg"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
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
        </div>
      </section>

      {/* MANIFESTO (dark) */}
      <section
        style={{
          background: "#1a1612",
          padding: "var(--space-16) var(--space-8)",
          color: "#e0ddd0",
        }}
      >
        <div className="container-md">
          <SectionLabel dark>Manifesto</SectionLabel>
          <div
            className="font-display"
            style={{
              fontSize: "var(--text-xl)",
              lineHeight: "var(--lh-relaxed)",
              fontStyle: "italic",
              color: "#f0eee6",
            }}
          >
            <p style={{ marginBottom: "var(--space-6)" }}>
              Trước khi có thành phố, trước khi có tôn giáo, trước khi có ngôn
              ngữ viết —{" "}
              <span style={{ color: "#d8955a", fontStyle: "normal" }}>
                đã có lửa.
              </span>
            </p>
            <p style={{ marginBottom: "var(--space-6)" }}>
              Và xung quanh lửa đó, người ta ngồi lại. Không phải vì họ phải
              ngồi. Mà vì{" "}
              <span style={{ color: "#d8955a", fontStyle: "normal" }}>
                lửa kéo người đến.
              </span>
            </p>
            <p>
              Focus.Camp không phát minh ra thứ gì mới. Chúng tôi chỉ{" "}
              <span style={{ color: "#d8955a", fontStyle: "normal" }}>
                giữ lửa.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section
        style={{
          padding: "var(--space-12) var(--space-8)",
          background: "var(--bg-body)",
        }}
      >
        <div className="container-md">
          <SectionLabel>Nguyên tắc cộng đồng</SectionLabel>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-6)",
            }}
          >
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.title}
                style={{
                  display: "flex",
                  gap: "var(--space-5)",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-2xl)",
                    fontWeight: "var(--fw-regular)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-display)",
                    lineHeight: 1,
                    flexShrink: 0,
                    width: 32,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--fw-bold)",
                      color: "var(--text-heading)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
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
        </div>
      </section>

      {/* DO / DON'T */}
      <section style={{ padding: "var(--space-12) var(--space-8) var(--space-16)" }}>
        <div className="container-lg">
          <SectionLabel>Dùng &amp; Không dùng</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            {DOS_DONTS.flatMap((row, i) => [
              <DoDontCard key={`do-${i}`} kind="do" text={row.do} />,
              <DoDontCard key={`dont-${i}`} kind="dont" text={row.dont} />,
            ])}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionLabel({
  children,
  dark,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: "var(--text-xs)",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: dark ? "rgba(240,238,230,0.6)" : "var(--text-muted)",
        marginBottom: "var(--space-6)",
        fontWeight: "var(--fw-medium)",
      }}
    >
      {children}
    </div>
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
        className="font-display"
        style={{
          fontSize: "var(--text-3xl)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-heading)",
          marginBottom: "var(--space-1)",
          lineHeight: "var(--lh-tight)",
        }}
      >
        {word}
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#c77a2d",
          marginBottom: "var(--space-3)",
          fontWeight: "var(--fw-semibold)",
        }}
      >
        {origin}
      </div>
      <p
        style={{
          fontFamily: "var(--font-body)",
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

function DoDontCard({ kind, text }: { kind: "do" | "dont"; text: string }) {
  const isDo = kind === "do";
  return (
    <div
      style={{
        padding: "var(--space-5)",
        borderRadius: "var(--r-lg)",
        background: isDo ? "rgba(27,158,117,0.08)" : "rgba(205,92,82,0.08)",
        border: `1px solid ${isDo ? "rgba(27,158,117,0.25)" : "rgba(205,92,82,0.25)"}`,
      }}
    >
      <div
        style={{
          fontSize: "var(--text-xs)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: isDo ? "var(--brand-green-dark)" : "#a35f2a",
          fontWeight: "var(--fw-bold)",
          marginBottom: "var(--space-3)",
        }}
      >
        {isDo ? "Nên dùng" : "Không dùng"}
      </div>
      <div
        className="font-body"
        style={{
          color: "var(--text-heading)",
          lineHeight: "var(--lh-relaxed)",
          fontSize: "var(--text-base)",
        }}
      >
        {text}
      </div>
    </div>
  );
}
