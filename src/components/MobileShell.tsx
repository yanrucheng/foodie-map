import { useRef, useState, useCallback, useMemo } from "react";
import { usePanelState, type PanelId } from "@/hooks/usePanelState";
import { BottomSheet } from "@/components/BottomSheet";
import { FilterPanel } from "@/components/FilterPanel";
import { StatsPanelReact } from "@/components/StatsPanelReact";
import { Legend } from "@/components/Legend";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { MapShell } from "@/components/MapShell";
import { MobilePopupCard } from "@/components/MobilePopupCard";
import type { MapShellHandle } from "@/components/MapShell";
import type { Restaurant } from "@/types/restaurant";
import type { VenueFilter } from "@/hooks/useFilters";

/** Tab button config for the FAB menu. */
const PANEL_TABS: { id: PanelId; icon: string; label: string }[] = [
  { id: "filter", icon: "⚙", label: "筛选" },
  { id: "stats", icon: "📊", label: "统计" },
  { id: "legend", icon: "🎨", label: "图例" },
];

interface MobileShellProps {
  /** Header title area — accepts a ReactNode (e.g. DynamicTitle). */
  headerContent: React.ReactNode;
  subtitle: string;
  restaurants: Restaurant[];
  /** Distinct cuisine_group keys present in the loaded data. */
  dataGroups: Set<string>;
  activeGroups: Set<string>;
  onToggle: (group: string) => void;
  enableGroup: (group: string) => void;
  venueFilter: VenueFilter;
  onVenueFilterChange: (filter: VenueFilter) => void;
  totalCount: number;
  geocodedCount: number;
  center: [number, number];
  zoom: number;
}

/**
 * Mobile-only layout orchestrator. Renders compact header, full-bleed map,
 * floating action button (FAB), and BottomSheet with tabbed panel content.
 * Enforces single-panel-at-a-time constraint via usePanelState.
 */
export function MobileShell({
  headerContent,
  subtitle,
  restaurants,
  dataGroups,
  activeGroups,
  onToggle,
  enableGroup,
  venueFilter,
  onVenueFilterChange,
  totalCount,
  geocodedCount,
  center,
  zoom,
}: MobileShellProps) {
  const mapRef = useRef<MapShellHandle>(null);
  const { activePanel, toggle, close } = usePanelState();
  const [displayMode, setDisplayMode] = useState<"marker" | "heat">("marker");
  const [popupRestaurant, setPopupRestaurant] = useState<Restaurant | null>(null);

  /** Handle marker tap on mobile: show full-width popup card. */
  const handleMarkerTap = useCallback((restaurant: Restaurant) => {
    setPopupRestaurant(restaurant);
  }, []);

  /** Close the mobile popup card. */
  const handleClosePopup = useCallback(() => {
    setPopupRestaurant(null);
  }, []);

  /** Handle search locate: enable group filter if needed, then fly to marker. */
  const handleLocate = useCallback(
    (restaurant: Restaurant) => {
      if (!activeGroups.has(restaurant.cuisine_group)) {
        enableGroup(restaurant.cuisine_group);
      }
      mapRef.current?.flyToRestaurant(restaurant);
      close();
    },
    [activeGroups, enableGroup, close]
  );

  /** Toggle display mode via MapShell's imperative handle. */
  const handleModeToggle = useCallback(() => {
    mapRef.current?.toggleMode();
  }, []);

  /** Visible restaurants filtered by active cuisine groups and venue type. */
  const visibleRestaurants = useMemo(
    () => restaurants.filter((r) =>
      activeGroups.has(r.cuisine_group) &&
      (venueFilter === "all" || r.venue_type === venueFilter)
    ),
    [restaurants, activeGroups, venueFilter]
  );

  /** Panel titles for the bottom sheet header. */
  const panelTitles: Record<PanelId, string> = {
    filter: "筛选",
    stats: "区域统计",
    legend: "图例",
  };

  return (
    <div className="mobile-shell">
      {/* Compact header */}
      <Header subtitle={subtitle} compact>
        {headerContent}
      </Header>

      {/* Search bar */}
      <div className="mobile-search-area">
        <SearchBar restaurants={restaurants} onLocate={handleLocate} />
      </div>

      {/* Full-bleed map */}
      <main className="mobile-map-container">
        <MapShell
          ref={mapRef}
          restaurants={restaurants}
          dataGroups={dataGroups}
          activeGroups={activeGroups}
          onToggleGroup={onToggle}
          venueFilter={venueFilter}
          onVenueFilterChange={onVenueFilterChange}
          center={center}
          zoom={zoom}
          hideControls
          onModeChange={setDisplayMode}
          onMarkerTap={handleMarkerTap}
        />
      </main>

      {/* FAB - floating action buttons */}
      <div className="mobile-fab-group">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`mobile-fab-btn ${activePanel === tab.id ? "active" : ""}`}
            onClick={() => toggle(tab.id)}
            aria-label={tab.label}
          >
            <span className="fab-icon">{tab.icon}</span>
          </button>
        ))}
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={activePanel !== null}
        title={activePanel ? panelTitles[activePanel] : undefined}
        onClose={close}
      >
        {activePanel === "filter" && (
          <FilterPanel
            dataGroups={dataGroups}
            activeGroups={activeGroups}
            onToggle={onToggle}
            venueFilter={venueFilter}
            onVenueFilterChange={onVenueFilterChange}
            onModeToggle={handleModeToggle}
            currentMode={displayMode}
            variant="pill"
          />
        )}
        {activePanel === "stats" && (
          <StatsPanelReact restaurants={visibleRestaurants} />
        )}
        {activePanel === "legend" && (
          <Legend dataGroups={dataGroups} totalCount={totalCount} geocodedCount={geocodedCount} compact />
        )}
      </BottomSheet>

      {/* Mobile popup card — shown on marker tap */}
      {popupRestaurant && (
        <MobilePopupCard restaurant={popupRestaurant} onClose={handleClosePopup} />
      )}
    </div>
  );
}
