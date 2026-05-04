import { useState } from "react";
import { cuisineRegistry, getGroupStyle } from "@/config/cuisineRegistry";

interface LegendProps {
  /** Distinct cuisine_group keys present in the loaded data. */
  dataGroups: Set<string>;
  totalCount: number;
  geocodedCount: number;
  /** When true, renders as a compact horizontal scrollable strip (mobile). */
  compact?: boolean;
}

/**
 * Legend showing cuisine group color swatches and coverage note.
 * Only displays groups present in the current dataset, sorted by taxonomy sortOrder.
 * Desktop: flex-wrap grid with full coverage text.
 * Mobile (compact): horizontal scrollable strip with info icon toggle for coverage note.
 */
export function Legend({ dataGroups, totalCount, geocodedCount, compact }: LegendProps) {
  const [showNote, setShowNote] = useState(false);

  const coveragePercent = totalCount > 0
    ? ((geocodedCount / totalCount) * 100).toFixed(1)
    : "0.0";

  // Filter taxonomy to groups present in the dataset, ordered by sortOrder.
  const visibleGroups = cuisineRegistry
    .filter((g) => dataGroups.has(g.key))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (compact) {
    return (
      <section className="legend-card floating-card legend-card--compact">
        <div className="legend-scroll">
          {visibleGroups.map((group) => {
            const style = getGroupStyle(group.key);
            return (
              <div key={group.key} className="legend-chip">
                <span className="legend-chip-dot" style={{ background: style.color }} />
                <span className="legend-chip-text">{group.labelZh}</span>
              </div>
            );
          })}
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
        {visibleGroups.map((group) => {
          const style = getGroupStyle(group.key);
          return (
            <div key={group.key} className="legend-item">
              <span className="swatch" style={{ background: style.color }} />
              <span>{group.labelZh}</span>
            </div>
          );
        })}
      </div>
      <div className="coverage-note">
        地理编码成功 {geocodedCount} / {totalCount}（{coveragePercent}%），区域 fallback 0 家；fallback 餐厅会在弹窗中标注。
      </div>
    </section>
  );
}
