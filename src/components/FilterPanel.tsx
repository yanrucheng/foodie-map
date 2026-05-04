import { cuisineRegistry, getGroupStyle } from "@/config/cuisineRegistry";
import type { VenueFilter } from "@/hooks/useFilters";

/** Venue filter segment options with display labels. */
const VENUE_FILTER_OPTIONS: { value: VenueFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "restaurant", label: "仅餐厅" },
  { value: "street_food", label: "仅街头小吃" },
  { value: "dessert", label: "仅甜品" },
];

interface FilterPanelProps {
  /** Distinct cuisine_group keys present in the loaded data — controls which groups to render. */
  dataGroups: Set<string>;
  activeGroups: Set<string>;
  onToggle: (group: string) => void;
  onToggleAll: () => void;
  venueFilter: VenueFilter;
  onVenueFilterChange: (filter: VenueFilter) => void;
  onModeToggle: () => void;
  currentMode: "marker" | "heat";
  /** "pill" renders touch-optimized pill buttons (mobile). Default: "checkbox". */
  variant?: "checkbox" | "pill";
}

/**
 * React filter panel for cuisine group filtering, venue type isolation,
 * and display mode toggle. Groups are ordered by taxonomy sortOrder and
 * only displayed if present in the active dataset.
 */
export function FilterPanel({
  dataGroups,
  activeGroups,
  onToggle,
  onToggleAll,
  venueFilter,
  onVenueFilterChange,
  onModeToggle,
  currentMode,
  variant = "checkbox",
}: FilterPanelProps) {
  const isPill = variant === "pill";

  // Render only taxonomy groups that exist in the current dataset, sorted by sortOrder.
  const renderedGroups = cuisineRegistry
    .filter((g) => dataGroups.has(g.key))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const allActive = renderedGroups.every((g) => activeGroups.has(g.key));

  return (
    <div className="floating-card control-block">
      {/* Venue type segment control */}
      {!isPill && <div className="control-title">类型筛选</div>}
      <div className="venue-filter-segment">
        {VENUE_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            className={`venue-segment-btn ${venueFilter === value ? "venue-segment-btn--active" : ""}`}
            onClick={() => onVenueFilterChange(value)}
            aria-pressed={venueFilter === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cuisine group filter */}
      {!isPill && (
        <div className="control-title-row" style={{ marginTop: 12 }}>
          <span className="control-title">菜系筛选</span>
          <button className={`toggle-all-btn ${allActive ? "toggle-all-btn--active" : ""}`} onClick={onToggleAll}>
            全选
          </button>
        </div>
      )}
      {isPill && (
        <div className="filter-section-divider-row">
          <div className="filter-section-divider" />
          <button className={`toggle-all-pill ${allActive ? "toggle-all-pill--active" : ""}`} onClick={onToggleAll}>
            全选
          </button>
        </div>
      )}
      <div className={isPill ? "filter-pills" : "filter-list"}>
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

      <button className="mode-btn" onClick={onModeToggle}>
        {currentMode === "marker" ? "切换到热力图" : "切换到标记模式"}
      </button>
    </div>
  );
}
