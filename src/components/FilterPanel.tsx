import { cuisineGroups } from "@/config/cuisineGroups";
import type { VenueFilter } from "@/hooks/useFilters";

/** Venue filter segment options with display labels. */
const VENUE_FILTER_OPTIONS: { value: VenueFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "restaurant", label: "仅餐厅" },
  { value: "street_food", label: "仅街头小吃" },
  { value: "dessert", label: "仅甜品" },
];

interface FilterPanelProps {
  activeGroups: Set<string>;
  onToggle: (group: string) => void;
  venueFilter: VenueFilter;
  onVenueFilterChange: (filter: VenueFilter) => void;
  onModeToggle: () => void;
  currentMode: "marker" | "heat";
  /** "pill" renders touch-optimized pill buttons (mobile). Default: "checkbox". */
  variant?: "checkbox" | "pill";
}

/**
 * React filter panel for cuisine group filtering, venue type isolation,
 * and display mode toggle.
 */
export function FilterPanel({
  activeGroups,
  onToggle,
  venueFilter,
  onVenueFilterChange,
  onModeToggle,
  currentMode,
  variant = "checkbox",
}: FilterPanelProps) {
  const isPill = variant === "pill";

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
      {!isPill && <div className="control-title" style={{ marginTop: 12 }}>菜系筛选</div>}
      {isPill && <div className="filter-section-divider" />}
      <div className={isPill ? "filter-pills" : "filter-list"}>
        {Object.entries(cuisineGroups).map(([label, style]) => {
          const active = activeGroups.has(label);

          if (isPill) {
            return (
              <button
                key={label}
                className={`filter-pill ${active ? "filter-pill--active" : ""}`}
                style={{
                  "--pill-color": style.color,
                  "--pill-text": style.text,
                } as React.CSSProperties}
                onClick={() => onToggle(label)}
                aria-pressed={active}
              >
                <span className="filter-pill-dot" style={{ background: style.color }} />
                <span className="filter-pill-label">{label}</span>
              </button>
            );
          }

          return (
            <label key={label} className="filter-item">
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggle(label)}
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
