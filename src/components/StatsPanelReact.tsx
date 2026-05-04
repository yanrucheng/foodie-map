import { useMemo } from "react";
import type { Restaurant } from "@/types/restaurant";

/** Region keys used in stats display. */
const REGIONS = ["港岛", "九龙", "新界", "离岛"] as const;

interface StatsPanelProps {
  restaurants: Restaurant[];
}

/**
 * React stats panel showing visible restaurant counts by region.
 * Replaces the imperative L.Control StatsPanel. On desktop, rendered via
 * createPortal into a Leaflet control container; on mobile, rendered
 * standalone for BottomSheet consumption.
 */
export function StatsPanelReact({ restaurants }: StatsPanelProps) {
  /** Compute region counts from visible restaurants. */
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    REGIONS.forEach((r) => {
      c[r] = 0;
    });
    restaurants.forEach((item) => {
      if (item.major_region in c) {
        c[item.major_region] = (c[item.major_region] ?? 0) + 1;
      }
    });
    return c;
  }, [restaurants]);

  return (
    <div className="floating-card stats-panel">
      <div className="control-title">当前可见区域统计</div>
      <div className="stats-grid">
        {REGIONS.map((region) => (
          <div key={region} className="stat-item">
            <div className="stat-label">{region}</div>
            <div className="stat-value">{counts[region] ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
