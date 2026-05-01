import { tierForLevel } from "@/lib/community-config";
import type { LevelTier } from "@/lib/community-config";

type Membership = {
  tier: string;
  className: string | null;
  xp: number;
  level: number;
};

export function ProfileLevelCard({
  membership,
  levelTiers,
}: {
  membership: Membership;
  levelTiers: LevelTier[];
}) {
  const tier = tierForLevel(membership.level, levelTiers);

  return (
    <div className="pf-level-card">
      <div className="pf-level-badge">{membership.level}</div>
      <div className="pf-level-info">
        <div className="pf-level-row">
          <span className="pf-level-title">
            Level {membership.level}
            {tier ? ` — ${tier.name}` : ` — ${membership.tier}`}
          </span>
        </div>
        <div className="pf-level-bar">
          <div
            className="pf-level-fill"
            style={{ width: `${Math.min(100, membership.xp % 100)}%` }}
          ></div>
        </div>
        <div className="pf-level-hint">
          {membership.xp} XP · còn {100 - (membership.xp % 100)} XP để lên
          level tiếp theo
        </div>
      </div>
    </div>
  );
}
