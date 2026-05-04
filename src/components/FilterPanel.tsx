import { cuisineGroups } from "@/config/cuisineGroups";

interface FilterPanelProps {
  activeGroups: Set<string>;
  onToggle: (group: string) => void;
  onModeToggle: () => void;
  currentMode: "marker" | "heat";
  /** "pill" renders touch-optimized pill buttons (mobile). Default: "checkbox". */
  variant?: "checkbox" | "pill";
}

/**
 * React filter panel for cuisine group filtering and display mode toggle.
 * Replaces the imperative L.Control FilterControl. On desktop, rendered via
 * createPortal into a Leaflet control container; on mobile, rendered
 * standalone for BottomSheet consumption with pill variant for touch targets.
 */
export function FilterPanel({
  activeGroups,
  onToggle,
  onModeToggle,
  currentMode,
  variant = "checkbox",
}: FilterPanelProps) {
  const isPill = variant === "pill";

  return (
    <div className="floating-card control-block">
      {!isPill && <div className="control-title">菜系筛选</div>}
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
