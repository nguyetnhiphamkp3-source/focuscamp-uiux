/**
 * Boss Sói widget — pixel-art mascot + name + tagline + HP bar.
 *
 * Purely visual gamification: members do tasks, boss takes damage (computed
 * server-side by computeBossState). Our own XP comes from those tasks, not
 * from fighting the boss — the boss is the shared "campfire storyline".
 */

const CODE_TO_CLASS: Record<string, string> = {
  ".": "px-t",
  D: "px-dg",
  G: "px-g",
  L: "px-lg",
  W: "px-wh",
  K: "px-bl",
  R: "px-rd",
  Y: "px-yw",
};

const WOLF_ROWS = [
  "..DD...DD.....",
  ".DGGD.DGD.....",
  ".DGGGDGGGD....",
  ".GRYGGGRYGD...",
  ".GGGGWGGGGD...",
  "..GWWKWWG.....",
  ".DGGDDDGDDDD..",
  ".DLGGGGGGGGDD.",
  ".DGGWWWWGGGGD.",
  "..DG..DG.GD...",
  "..DD..DD.DD...",
  "..KK..KK.KK...",
];

export function BossWidget({
  name,
  tagline,
  hpPct,
  currentHp,
  maxHp,
  defeated = false,
}: {
  name: string;
  tagline?: string;
  /** 0..1 */
  hpPct: number;
  currentHp: number;
  maxHp: number;
  defeated?: boolean;
}) {
  const pctClamped = Math.max(0, Math.min(1, hpPct));
  const barColor =
    pctClamped > 0.5
      ? "var(--success, #248046)"
      : pctClamped > 0.2
        ? "#f0b232"
        : "var(--danger, #da373c)";

  return (
    <div className="boss-widget">
      {tagline && !defeated && (
        <div className="boss-tagline" aria-hidden="true">
          {tagline}
        </div>
      )}
      {defeated && (
        <div className="boss-tagline boss-tagline-defeated">Đã bị hạ 💀</div>
      )}

      <div
        className="wolf-scene boss-scene"
        aria-label={`Boss ${name} — ${currentHp}/${maxHp} HP`}
      >
        <div className="wolf-spark" />
        <div className="wolf-spark" />
        <div className="wolf-spark" />
        <div className="wolf-spark" />
        <div className="wolf-spark" />
        <div className="wolf-spark" />

        <div
          className={`wolf-wrap ${defeated ? "wolf-wrap-defeated" : ""}`}
          style={defeated ? { animation: "none", left: "50%", transform: "translateX(-50%)" } : undefined}
        >
          <div className="wolf">
            {WOLF_ROWS.flatMap((row, rowIdx) =>
              row.split("").map((code, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`px ${CODE_TO_CLASS[code] ?? "px-t"}`}
                />
              ))
            )}
          </div>
          <div className="wolf-shadow" />
        </div>
      </div>

      <div className="boss-hp-wrap" title={`HP ${currentHp}/${maxHp}`}>
        <div
          className="boss-hp-bar"
          style={{
            width: `${Math.round(pctClamped * 100)}%`,
            background: barColor,
          }}
        />
      </div>
      <div className="boss-hp-label">
        HP {currentHp.toLocaleString()}/{maxHp.toLocaleString()}
      </div>

      <div className="boss-name">{name}</div>
    </div>
  );
}

/** Kept as alias for any code still importing PixelWolf (it renders a
 *  default-config boss). */
export function PixelWolf() {
  return (
    <BossWidget
      name="Boss Sói"
      tagline="Kẻ gác cổng đầu tiên"
      hpPct={1}
      currentHp={100}
      maxHp={100}
    />
  );
}
