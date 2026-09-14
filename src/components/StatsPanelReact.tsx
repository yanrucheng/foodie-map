import { useMemo } from "react";
import type { Restaurant } from "@/types/restaurant";
import { hasText } from "@/data/contract";

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
    const counts = new Map<string, number>();
    restaurants.forEach((item) => {
      const key = item.primary_area;
      if (hasText(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });
    return [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Show top 8 districts to keep the panel compact
  }, [restaurants]);

  if (districts.length === 0) return <p className="stats-empty floating-card stats-panel">暂无区域统计，可调整筛选或查看餐厅详情。</p>;

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
