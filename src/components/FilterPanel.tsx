import { cuisineGroups } from "@/config/cuisineGroups";

interface FilterPanelProps {
  activeGroups: Set<string>;
  onToggle: (group: string) => void;
  onModeToggle: () => void;
  currentMode: "marker" | "heat";
}

/**
 * React filter panel for cuisine group filtering and display mode toggle.
 * Replaces the imperative L.Control FilterControl. On desktop, rendered via
 * createPortal into a Leaflet control container; on mobile, rendered
 * standalone for BottomSheet consumption.
 */
export function FilterPanel({
  activeGroups,
  onToggle,
  onModeToggle,
  currentMode,
}: FilterPanelProps) {
  return (
    <div className="floating-card control-block">
      <div className="control-title">菜系筛选</div>
      <div className="filter-list">
        {Object.entries(cuisineGroups).map(([label, style]) => (
          <label key={label} className="filter-item">
            <input
              type="checkbox"
              checked={activeGroups.has(label)}
              onChange={() => onToggle(label)}
            />
            <span className="swatch" style={{ background: style.color }} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <button className="mode-btn" onClick={onModeToggle}>
        {currentMode === "marker" ? "切换到热力图" : "切换到标记模式"}
      </button>
    </div>
  );
}
