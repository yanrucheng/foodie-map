import { type CuisineGroup, getGroupStyle, diningDisplayCounts, diningCategoryOrder, diningCategories, getDiningCategory, type DiningCounts } from "@/config/restaurantPresentation";
import type { DiningFilter } from "@/hooks/useFilters";

interface FilterPanelProps {
  /** Distinct cuisine_group keys present in the loaded data — controls which groups to render. */
  dataGroups: Set<string>;
  groups: CuisineGroup[];
  activeGroups: Set<string>;
  onToggle: (group: string) => void;
  onToggleAll: () => void;
  diningFilter: DiningFilter;
  diningCounts: DiningCounts;
  onDiningFilterChange: (filter: DiningFilter) => void;
  onModeToggle: () => void;
  currentMode: "marker" | "heat";
  /** "pill" renders touch-optimized pill buttons (mobile). Default: "checkbox". */
  variant?: "checkbox" | "pill";
}

/**
 * React filter panel for cuisine group filtering, dining category filtering,
 * and display mode toggle. Groups are ordered by taxonomy sortOrder and
 * only displayed if present in the active dataset.
 */
export function FilterPanel({
  dataGroups,
  groups,
  activeGroups,
  onToggle,
  onToggleAll,
  diningFilter,
  diningCounts,
  onDiningFilterChange,
  onModeToggle,
  currentMode,
  variant = "checkbox",
}: FilterPanelProps) {
  const isPill = variant === "pill";

  // Render only taxonomy groups that exist in the current dataset, sorted by sortOrder.
  const renderedGroups = groups
    .filter((g) => dataGroups.has(g.key))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const allActive = renderedGroups.every((g) => activeGroups.has(g.key));

  const displayCounts = diningDisplayCounts(diningCounts);
  const options: { value: DiningFilter; label: string; count: number }[] = [
    { value: "all", label: "全部", count: Object.values(displayCounts).reduce((a, b) => a + b, 0) },
    ...diningCategoryOrder.filter((key) => displayCounts[key] > 0).map((value) => ({ value, label: diningCategories[value].label, count: displayCounts[value] })),
  ];

  return (
    <div className="floating-card control-block">
      <div className="control-title">主打体验</div>
      <p className="dining-count-note">数量按本版全部收录（含无坐标）</p>
      <div className="dining-filter-segment" role="group" aria-label="主打体验筛选">
        {options.map(({ value, label, count }) => (
          <button
            key={value}
            data-dining={value}
            className={`dining-segment-btn ${diningFilter === value ? "dining-segment-btn--active" : ""}`}
            onClick={() => onDiningFilterChange(value)}
            aria-pressed={diningFilter === value}
          >
            {value !== "all" && <span className="dining-icon" dangerouslySetInnerHTML={{ __html: getDiningCategory(value).svg }} />}
            <span>{label} {count}</span>
          </button>
        ))}
      </div>

      {/* Cuisine group filter */}
      {!isPill && (
        <div className="control-title-row" style={{ marginTop: 12 }}>
          <span className="control-title">菜系与品类</span>
          <button className={`toggle-all-btn ${allActive ? "toggle-all-btn--active" : ""}`} onClick={onToggleAll}>
            {allActive ? "仅保留首项" : "全选"}
          </button>
        </div>
      )}
      {isPill && (
        <div className="filter-section-divider-row">
          <span className="control-title">菜系与品类</span>
          <div className="filter-section-divider" />
          <button className={`toggle-all-pill ${allActive ? "toggle-all-pill--active" : ""}`} onClick={onToggleAll}>
            {allActive ? "仅保留首项" : "全选"}
          </button>
        </div>
      )}
      <div role="group" aria-label="菜系与品类" className={isPill ? "filter-pills" : "filter-list"}>
        {renderedGroups.map((group) => {
          const style = getGroupStyle(group.key);
          const active = activeGroups.has(group.key);
          const label = group.labelZh;

          if (isPill) {
            return (
              <button
                key={group.key}
                className={`filter-pill ${active ? "filter-pill--active" : ""}`}
                style={{
                  "--pill-color": style.color,
                  "--pill-text": style.textColor,
                } as React.CSSProperties}
                onClick={() => onToggle(group.key)}
                aria-pressed={active}
              >
                <span className="filter-pill-dot" style={{ background: style.color }} />
                <span className="filter-pill-label">{label}</span>
              </button>
            );
          }

          return (
            <label key={group.key} className="filter-item">
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggle(group.key)}
              />
              <span className="swatch" style={{ background: style.color }} />
              <span>{label}</span>
            </label>
          );
        })}
      </div>

      <p className="mode-status" role="status">当前图层：{currentMode === "marker" ? "餐厅标记" : "热力图"}</p>
      <button className="mode-btn" onClick={onModeToggle}>
        {currentMode === "marker" ? "切换到热力图" : "切换到标记模式"}
      </button>
    </div>
  );
}
