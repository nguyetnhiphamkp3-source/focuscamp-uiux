import { Fragment } from "react";

export const metadata = {
  title: "Direct Challenge — focus.camp",
  description:
    "Triết học của những người chọn lửa. Cuộc đời sẽ thử thách bạn dù bạn có muốn hay không. Câu hỏi duy nhất là: ai chọn thử thách đó?",
};

const TRUTHS = [
  {
    n: "1",
    title: "Thử thách không thể tránh — chỉ có thể chọn",
    body: "Không ai thoát khỏi khó khăn. Người yếu bị nó ập vào. Người mạnh bước vào trước.",
  },
  {
    n: "2",
    title: "Liều nhỏ tạo ra miễn dịch — liều lớn tạo ra sang chấn",
    body: "Không phải thử thách nào cũng tốt. Direct Challenge là nghệ thuật tìm đúng liều — đủ đau để học, không đủ đau để gãy.",
  },
  {
    n: "3",
    title: "Một mình thì rèn được thân — có vòng tròn thì rèn được hồn",
    body: "Thử thách một mình xây dựng kỷ luật. Kể lại thử thách quanh lửa mới xây dựng được bản sắc.",
  },
];

const COMPARISON = [
  { indirect: "Bị thử thách", direct: "Chọn thử thách" },
  { indirect: "Phản ứng từ chỗ yếu", direct: "Phản ứng từ chỗ mạnh" },
  {
    indirect: "Chờ đến khi buộc phải thay đổi",
    direct: "Thay đổi trước khi bị buộc",
  },
  { indirect: "Sợ thất bại", direct: "Dùng thất bại như dữ liệu" },
];

const LIFECYCLE = ["CHỌN", "TUYÊN BỐ", "ĐỐI MẶT", "KỂ LẠI"];

export default function DirectChallengePage() {
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
          <Label>Triết học</Label>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--fw-bold)",
              fontSize: "var(--text-3xl)",
              lineHeight: "var(--lh-snug)",
              color: "var(--text-heading)",
              marginBottom: "var(--space-3)",
            }}
          >
            Direct Challenge
          </h1>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-xl)",
              color: "var(--text-muted)",
              marginBottom: "var(--space-4)",
            }}
          >
            Triết học của những người chọn lửa
          </div>
          <div style={{ fontSize: "var(--text-2xl)" }}>⚔️🔥</div>
        </header>

        {/* CORE QUOTE */}
        <Section label="Một câu duy nhất">
          <blockquote
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-xl)",
              lineHeight: "var(--lh-relaxed)",
              color: "#f0eee6",
              background: "#1a1612",
              padding: "var(--space-10) var(--space-8)",
              borderRadius: "var(--r-xl)",
              boxShadow: "var(--shadow-md)",
              borderLeft: "4px solid #ff7043",
            }}
          >
            Cuộc đời sẽ thử thách bạn dù bạn có muốn hay không. Câu hỏi duy
            nhất là:{" "}
            <em style={{ color: "#ff7043", fontStyle: "normal" }}>
              ai chọn thử thách đó
            </em>{" "}
            — bạn, hay cuộc đời?
          </blockquote>
        </Section>

        {/* 3 TRUTHS */}
        <Section label="Ba sự thật nền tảng">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
            }}
          >
            {TRUTHS.map((t) => (
              <div
                key={t.n}
                style={{
                  display: "flex",
                  gap: "var(--space-5)",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "var(--brand-green)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-heading)",
                    fontWeight: "var(--fw-bold)",
                    fontSize: "var(--text-lg)",
                  }}
                >
                  {t.n}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--fw-bold)",
                      color: "var(--text-heading)",
                      margin: "0 0 var(--space-2) 0",
                    }}
                  >
                    {t.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "var(--text-base)",
                      lineHeight: "var(--lh-relaxed)",
                      color: "var(--text-normal)",
                      margin: 0,
                    }}
                  >
                    {t.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* TWO KINDS */}
        <Section label="Hai loại người">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--r-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "var(--space-4) var(--space-5)",
                background: "var(--bg-card)",
                borderBottom: "1px solid var(--border-subtle)",
                borderRight: "1px solid var(--border-subtle)",
                fontWeight: "var(--fw-bold)",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Indirect
            </div>
            <div
              style={{
                padding: "var(--space-4) var(--space-5)",
                background: "rgba(27,158,117,0.08)",
                borderBottom: "1px solid var(--border-subtle)",
                fontWeight: "var(--fw-bold)",
                color: "var(--brand-green)",
                fontSize: "var(--text-sm)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Direct
            </div>
            {COMPARISON.map((row, i) => (
              <Fragment key={i}>
                <div
                  style={{
                    padding: "var(--space-4) var(--space-5)",
                    borderRight: "1px solid var(--border-subtle)",
                    borderBottom:
                      i < COMPARISON.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    color: "var(--text-normal)",
                    fontSize: "var(--text-base)",
                  }}
                >
                  {row.indirect}
                </div>
                <div
                  style={{
                    padding: "var(--space-4) var(--space-5)",
                    background: "rgba(27,158,117,0.04)",
                    borderBottom:
                      i < COMPARISON.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    color: "var(--text-heading)",
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--fw-medium)",
                  }}
                >
                  {row.direct}
                </div>
              </Fragment>
            ))}
          </div>
        </Section>

        {/* LIFECYCLE */}
        <Section label="Vòng đời của một Keeper">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-3)",
              flexWrap: "wrap",
              padding: "var(--space-8) 0",
            }}
          >
            {LIFECYCLE.map((step, i) => (
              <span
                key={step}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "var(--space-3) var(--space-6)",
                    borderRadius: 999,
                    border: "2px solid var(--brand-green)",
                    color: "var(--brand-green)",
                    fontFamily: "var(--font-heading)",
                    fontWeight: "var(--fw-bold)",
                    fontSize: "var(--text-md)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {step}
                </span>
                {i < LIFECYCLE.length - 1 && (
                  <span
                    style={{
                      color: "var(--brand-green)",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--fw-bold)",
                    }}
                  >
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
          <p
            style={{
              fontSize: "var(--text-base)",
              lineHeight: "var(--lh-relaxed)",
              color: "var(--text-normal)",
              textAlign: "center",
              marginTop: "var(--space-4)",
              maxWidth: 560,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Không có bước nào được bỏ. Đặc biệt bước cuối — vì{" "}
            <strong style={{ color: "var(--text-heading)" }}>
              thử thách chưa hoàn thành cho đến khi được kể lại quanh lửa.
            </strong>
          </p>
        </Section>

        {/* KEEPER */}
        <Section label="Keeper là gì">
          <p
            style={{
              fontSize: "var(--text-md)",
              lineHeight: "var(--lh-relaxed)",
              color: "var(--text-normal)",
              marginBottom: "var(--space-4)",
            }}
          >
            Keeper không phải danh hiệu. Keeper là người đã đi qua đủ nhiều
            Direct Challenge đến mức{" "}
            <strong style={{ color: "var(--text-heading)" }}>
              họ không còn sợ việc chọn thêm một cái nữa.
            </strong>
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-lg)",
              lineHeight: "var(--lh-relaxed)",
              color: "var(--text-muted)",
              paddingLeft: "var(--space-4)",
              borderLeft: "2px solid var(--border-subtle)",
            }}
          >
            Họ không dạy. Họ không coach. Họ chỉ ngồi đó — và sự hiện diện của
            họ nhắc mọi người rằng: vượt qua được.
          </p>
        </Section>

        {/* CALL TO ACTION */}
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-16) var(--space-4)",
            marginTop: "var(--space-10)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--fw-bold)",
              fontSize: "var(--text-2xl)",
              lineHeight: "var(--lh-snug)",
              color: "var(--text-heading)",
              marginBottom: "var(--space-3)",
            }}
          >
            Đừng đợi cuộc đời ra đề.
          </h2>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--fw-bold)",
              fontSize: "var(--text-2xl)",
              lineHeight: "var(--lh-snug)",
              color: "#ff7043",
              marginBottom: "var(--space-10)",
            }}
          >
            Hãy tự ra đề cho mình.
          </h2>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-base)",
              color: "var(--text-muted)",
            }}
          >
            focus.camp — Nơi người ta chọn lửa của mình.
          </p>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: "var(--fw-medium)",
        marginBottom: "var(--space-3)",
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
