import { cuisineGroups } from "@/config/cuisineGroups";

interface LegendProps {
  totalCount: number;
  geocodedCount: number;
}

/** Bottom legend bar showing cuisine group color swatches and coverage note. */
export function Legend({ totalCount, geocodedCount }: LegendProps) {
  const coveragePercent = totalCount > 0
    ? ((geocodedCount / totalCount) * 100).toFixed(1)
    : "0.0";

  return (
    <section className="legend-card floating-card">
      <div className="legend-wrap">
        {Object.entries(cuisineGroups).map(([label, style]) => (
          <div key={label} className="legend-item">
            <span className="swatch" style={{ background: style.color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="coverage-note">
        地理编码成功 {geocodedCount} / {totalCount}（{coveragePercent}%），区域 fallback 0 家；fallback 餐厅会在弹窗中标注。
      </div>
    </section>
  );
}
