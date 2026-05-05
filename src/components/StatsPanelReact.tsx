import { useMemo } from "react";
import type { Restaurant } from "@/types/restaurant";

interface StatsPanelProps {
  restaurants: Restaurant[];
}

/**
 * React stats panel showing visible restaurant counts by district.
 * Dynamically derives district distribution from the current dataset.
 */
export function StatsPanelReact({ restaurants }: StatsPanelProps) {
  /** Derive district counts from visible restaurants, sorted by count descending. */
  const districts = useMemo(() => {
    const c: Record<string, number> = {};
    restaurants.forEach((item) => {
      const key = item.primary_area;
      if (key) {
        c[key] = (c[key] ?? 0) + 1;
      }
    });
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Show top 8 districts to keep the panel compact
  }, [restaurants]);

  if (districts.length === 0) return null;

  return (
    <div className="floating-card stats-panel">
      <div className="control-title">区域分布</div>
      <div className="stats-grid">
        {districts.map(([name, count]) => (
          <div key={name} className="stat-item">
            <div className="stat-label">{name}</div>
            <div className="stat-value">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
