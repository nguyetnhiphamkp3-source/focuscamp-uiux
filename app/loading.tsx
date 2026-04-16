/**
 * Loading fallback — ember growing into a flame.
 * Pure CSS animation. Three stacked flame layers (core / mid / outer glow)
 * + a base log + a pulsing ember glow read as "spark catching, breathing
 * into a fire". Matches the 'chọn lửa' brand motif.
 */
export default function Loading() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div className="ember-loader" aria-hidden="true">
          <div className="ember-flame ember-flame-outer" />
          <div className="ember-flame ember-flame-mid" />
          <div className="ember-flame ember-flame-core" />
          <div className="ember-glow" />
          <div className="ember-log" />
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Đang tải…
        </div>
      </div>

      <style>{`
        .ember-loader {
          position: relative;
          width: 80px;
          height: 110px;
        }
        .ember-log {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          width: 60px;
          height: 10px;
          border-radius: 5px;
          background: linear-gradient(180deg, #6b4226 0%, #3a2414 100%);
          box-shadow: 0 -1px 0 rgba(255,180,100,0.25) inset;
        }
        .ember-glow {
          position: absolute;
          left: 50%;
          bottom: 6px;
          transform: translateX(-50%);
          width: 38px;
          height: 8px;
          border-radius: 50%;
          background: radial-gradient(ellipse, #ffb347 0%, #ff5722 45%, transparent 80%);
          filter: blur(3px);
          animation: ember-breathe 1.5s ease-in-out infinite;
        }
        .ember-flame {
          position: absolute;
          left: 50%;
          bottom: 6px;
          transform-origin: center bottom;
          border-radius: 50% 50% 30% 30% / 70% 70% 30% 30%;
          will-change: transform, opacity;
        }
        .ember-flame-outer {
          width: 46px;
          height: 78px;
          margin-left: -23px;
          background: radial-gradient(ellipse at 50% 100%,
            rgba(255,213,79,0.55) 0%,
            rgba(255,112,67,0.35) 40%,
            transparent 80%);
          filter: blur(6px);
          animation: flame-grow 2.2s ease-in-out infinite;
        }
        .ember-flame-mid {
          width: 30px;
          height: 60px;
          margin-left: -15px;
          background: radial-gradient(ellipse at 50% 100%,
            #ffb74d 5%,
            #ff5722 55%,
            #cc2244 85%,
            transparent 100%);
          filter: blur(2px);
          animation: flame-grow 1.7s ease-in-out infinite 0.15s;
        }
        .ember-flame-core {
          width: 18px;
          height: 38px;
          margin-left: -9px;
          background: radial-gradient(ellipse at 50% 100%,
            #ffe082 10%,
            #ffb74d 55%,
            #ff7043 90%,
            transparent 100%);
          filter: blur(1px);
          animation: flame-grow 1.3s ease-in-out infinite 0.3s;
        }
        @keyframes ember-breathe {
          0%, 100% {
            transform: translateX(-50%) scaleX(0.92);
            opacity: 0.75;
          }
          50% {
            transform: translateX(-50%) scaleX(1.15);
            opacity: 1;
          }
        }
        @keyframes flame-grow {
          0% {
            transform: scaleY(0.18) scaleX(0.55) translateY(12px);
            opacity: 0.35;
          }
          30% {
            transform: scaleY(0.65) scaleX(0.85) translateY(4px);
            opacity: 0.85;
          }
          55% {
            transform: scaleY(1) scaleX(1) translateY(-4px);
            opacity: 1;
          }
          72% {
            transform: scaleY(0.92) scaleX(0.98) translateY(-2px);
            opacity: 0.95;
          }
          100% {
            transform: scaleY(0.3) scaleX(0.62) translateY(10px);
            opacity: 0.45;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ember-flame, .ember-glow {
            animation: none;
          }
          .ember-flame-core { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
