import { useId, useState } from "react";
import { type CuisineGroup, getGroupStyle, encodingExplanation } from "@/config/restaurantPresentation";

interface LegendProps {
  /** Distinct cuisine_group keys present in the loaded data. */
  dataGroups: Set<string>;
  groups: CuisineGroup[];
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
export function Legend({ dataGroups, groups, totalCount, geocodedCount, compact }: LegendProps) {
  const noteId = useId();
  const [showNote, setShowNote] = useState(false);

  const coveragePercent = totalCount > 0
    ? ((geocodedCount / totalCount) * 100).toFixed(1)
    : "0.0";

  // Filter taxonomy to groups present in the dataset, ordered by sortOrder.
  const visibleGroups = groups
    .filter((g) => dataGroups.has(g.key))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (compact) {
    return (
      <section className="legend-card floating-card legend-card--compact">
        <div className="legend-scroll">
          <span className="encoding-note">{encodingExplanation}</span>
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
          aria-controls={showNote ? noteId : undefined}
        >
          ℹ
        </button>
        {showNote && (
          <div id={noteId} className="legend-compact-note">
            可定位 {geocodedCount} / 收录 {totalCount}（{coveragePercent}%）
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="legend-card floating-card">
      <p className="encoding-note">{encodingExplanation}</p>
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
        可定位 {geocodedCount} / 收录 {totalCount}（{coveragePercent}%）
      </div>
    </section>
  );
}
