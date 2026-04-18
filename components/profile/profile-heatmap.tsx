import type { HeatmapDay } from "@/lib/services/profile";
import { ActivityHeatmap } from "./activity-heatmap";

export function ProfileHeatmap({
  heatmap,
  totalContributions,
}: {
  heatmap: HeatmapDay[];
  totalContributions: number;
}) {
  if (heatmap.length === 0 || totalContributions === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <ActivityHeatmap
        days={heatmap}
        totalContributions={totalContributions}
      />
    </div>
  );
}
