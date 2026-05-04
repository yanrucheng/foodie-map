import { useState } from "react";
import { cuisineGroups } from "@/config/cuisineGroups";

interface LegendProps {
  totalCount: number;
  geocodedCount: number;
  /** When true, renders as a compact horizontal scrollable strip (mobile). */
  compact?: boolean;
}

/**
 * Legend showing cuisine group color swatches and coverage note.
 * Desktop: flex-wrap grid with full coverage text.
 * Mobile (compact): horizontal scrollable strip with info icon toggle for coverage note.
 */
export function Legend({ totalCount, geocodedCount, compact }: LegendProps) {
  const [showNote, setShowNote] = useState(false);

  const coveragePercent = totalCount > 0
    ? ((geocodedCount / totalCount) * 100).toFixed(1)
    : "0.0";

  if (compact) {
    return (
      <section className="legend-card floating-card legend-card--compact">
        <div className="legend-scroll">
          {Object.entries(cuisineGroups).map(([label, style]) => (
            <div key={label} className="legend-chip">
              <span className="legend-chip-dot" style={{ background: style.color }} />
              <span className="legend-chip-text">{label}</span>
            </div>
          ))}
        </div>
        <button
          className="legend-info-btn"
          onClick={() => setShowNote((v) => !v)}
          aria-label="显示覆盖率信息"
          aria-expanded={showNote}
        >
          ℹ
        </button>
        {showNote && (
          <div className="legend-compact-note">
            地理编码成功 {geocodedCount} / {totalCount}（{coveragePercent}%）
          </div>
        )}
      </section>
    );
  }

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
