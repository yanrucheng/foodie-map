import { useLayoutEffect, useRef, type MouseEvent } from "react";
import { type CuisineGroup, getGroupStyle, diningDisplayCounts, diningCategoryOrder, diningCategories, getDiningCategory, type DiningCounts } from "@/config/restaurantPresentation";
import type { DiningFilter, StarFilter } from "@/hooks/useFilters";

interface FilterPanelProps {
  /** Options always come from the complete loaded edition. */
  dataGroups: Set<string>;
  groups: CuisineGroup[];
  activeGroups: Set<string>;
  onToggle: (group: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  filtersReady: boolean;
  showStarFilter: boolean;
  starFilter: StarFilter;
  onStarFilterChange: (filter: StarFilter) => void;
  diningFilter: DiningFilter;
  diningCounts: DiningCounts;
  onDiningFilterChange: (filter: DiningFilter) => void;
  onModeToggle: () => void;
  currentMode: "marker" | "heat";
}

const starOptions: { value: StarFilter; label: string }[] = [
  { value: "all", label: "全部" }, { value: 1, label: "一星" },
  { value: 2, label: "二星" }, { value: 3, label: "三星" },
];

/** Shared desktop/mobile controls; the containing panel owns scrolling. */
export function FilterPanel({
  dataGroups, groups, activeGroups, onToggle, onSelectAll, onDeselectAll,
  filtersReady, showStarFilter, starFilter, onStarFilterChange,
  diningFilter, diningCounts, onDiningFilterChange, onModeToggle, currentMode,
}: FilterPanelProps) {
  const renderedGroups = groups.filter((g) => dataGroups.has(g.key)).sort((a, b) => a.sortOrder - b.sortOrder);
  const ready = filtersReady && renderedGroups.length > 0;
  const allActive = renderedGroups.every((g) => activeGroups.has(g.key));
  const noneActive = renderedGroups.every((g) => !activeGroups.has(g.key));
  const selectButton = useRef<HTMLButtonElement>(null);
  const deselectButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"select" | "deselect" | null>(null);
  // Native disabled buttons leave the tab order. Move owned focus after React
  // commits the opposite action's enabled state, including Safari keyboard use.
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      (pendingFocus.current === "select" ? selectButton : deselectButton).current?.focus();
      pendingFocus.current = null;
    }
  });
  const bulkAction = (event: MouseEvent<HTMLButtonElement>, select: boolean) => {
    if (document.activeElement === event.currentTarget) pendingFocus.current = select ? "deselect" : "select";
    if (select) onSelectAll(); else onDeselectAll();
  };
  const displayCounts = diningDisplayCounts(diningCounts);
  const options: { value: DiningFilter; label: string }[] = [
    { value: "all", label: "全部" },
    ...diningCategoryOrder.filter((key) => displayCounts[key] > 0).map((value) => ({ value, label: diningCategories[value].label })),
  ];

  return (
    <div className="floating-card control-block">
      {showStarFilter && <section className="filter-section" aria-label="米其林星级">
        <div className="control-title">米其林星级</div>
        <div className="star-filter-segment" role="group" aria-label="米其林星级筛选">
          {starOptions.map(({ value, label }) => <button key={value} data-stars={value}
            className="star-segment-btn" aria-pressed={starFilter === value} disabled={!filtersReady}
            onClick={() => onStarFilterChange(value)}>{label}</button>)}
        </div>
      </section>}
      <section className="filter-section" aria-label="主打体验">
        <div className="control-title">主打体验</div>
        <div className="dining-filter-segment" role="group" aria-label="主打体验筛选">
          {options.map(({ value, label }) => (
            <button key={value} data-dining={value}
              className={`dining-segment-btn ${diningFilter === value ? "dining-segment-btn--active" : ""}`}
              onClick={() => onDiningFilterChange(value)} aria-pressed={diningFilter === value} disabled={!filtersReady}>
              <span className="dining-icon" aria-hidden="true">
                {value === "all" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="3" width="7" height="7" rx="1.4" />
                  <rect x="3" y="14" width="7" height="7" rx="1.4" /><rect x="14" y="14" width="7" height="7" rx="1.4" />
                </svg> : <span dangerouslySetInnerHTML={{ __html: getDiningCategory(value).svg }} />}
              </span>
              <span className="dining-label">{label}</span>
              <span className="selection-mark" aria-hidden="true">✓</span>
            </button>
          ))}
        </div>
      </section>
      <section className="filter-section" aria-label="菜系与品类操作">
        <div className="control-title-row">
          <span className="control-title">菜系与品类</span>
          <div className="cuisine-bulk-actions">
            <button ref={selectButton} className="toggle-all-btn" disabled={!ready || allActive} onClick={(event) => bulkAction(event, true)}>全选</button>
            <button ref={deselectButton} className="toggle-all-btn" disabled={!ready || noneActive} onClick={(event) => bulkAction(event, false)}>全不选</button>
          </div>
        </div>
        {ready && noneActive && <p className="filter-empty-note" role="status">尚未选择菜系。勾选想看的菜系，或点击“全选”。</p>}
        <div role="group" aria-label="菜系与品类" className="filter-list">
          {renderedGroups.map((group) => <label key={group.key} className="filter-item">
            <input type="checkbox" checked={activeGroups.has(group.key)} disabled={!ready} onChange={() => onToggle(group.key)} />
            <span className="swatch" style={{ background: getGroupStyle(group.key).color }} />
            <span>{group.labelZh}</span>
          </label>)}
        </div>
      </section>
      <p className="mode-status" role="status">当前图层：{currentMode === "marker" ? "餐厅标记" : "热力图"}</p>
      <button className="mode-btn" onClick={onModeToggle}>{currentMode === "marker" ? "切换到热力图" : "切换到标记模式"}</button>
    </div>
  );
}
