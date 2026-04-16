/**
 * Pixel Wolf Boss — mascot that patrols the bottom of a container.
 *
 * Stateless / server-renderable. The animation is pure CSS (see
 * prototype.css .wolf-*). Place inside any container that needs a bit
 * of personality at the bottom — we use it in the right sidebar.
 *
 * Pixel grid is 14 columns × 12 rows, encoded as short codes below
 * (see `CODE_TO_CLASS`). Keeping the art as data (not 168 divs) lets
 * us re-skin or tweak the sprite by editing one matrix.
 */

const CODE_TO_CLASS: Record<string, string> = {
  ".": "px-t", // transparent
  D: "px-dg", // dark gray
  G: "px-g", // gray
  L: "px-lg", // light gray
  W: "px-wh", // white
  K: "px-bl", // black
  R: "px-rd", // red
  Y: "px-yw", // yellow
};

// 14 chars per row, 12 rows. See /Users/mdm/Downloads/pixel-wolf for source.
const WOLF_ROWS = [
  "..DD...DD.....", // 0 ears
  ".DGGD.DGD.....", // 1
  ".DGGGDGGGD....", // 2 head top
  ".GRYGGGRYGD...", // 3 eyes (red/yellow)
  ".GGGGWGGGGD...", // 4 face
  "..GWWKWWG.....", // 5 snout (black nose)
  ".DGGDDDGDDDD..", // 6 neck
  ".DLGGGGGGGGDD.", // 7 body
  ".DGGWWWWGGGGD.", // 8 belly
  "..DG..DG.GD...", // 9 legs top
  "..DD..DD.DD...", // 10 legs
  "..KK..KK.KK...", // 11 paws (black)
];

/**
 * Top-to-bottom patrol wolf. Parent should set its height to at least 80px
 * (the scene fixed at 80px tall).
 */
export function PixelWolf() {
  return (
    <div className="wolf-scene" aria-hidden="true">
      {/* Sparkles — positioned via CSS nth-child */}
      <div className="wolf-spark" />
      <div className="wolf-spark" />
      <div className="wolf-spark" />
      <div className="wolf-spark" />
      <div className="wolf-spark" />
      <div className="wolf-spark" />

      <div className="wolf-wrap">
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
  );
}
