import { useState, useCallback, type RefObject, type ReactNode } from "react";
import { usePanelState, type PanelId } from "@/hooks/usePanelState";
import { BottomSheet } from "@/components/BottomSheet";
import { FilterPanel } from "@/components/FilterPanel";
import { StatsPanelReact } from "@/components/StatsPanelReact";
import { Legend } from "@/components/Legend";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { MapShell, type MapShellHandle, type MapShellProps } from "@/components/MapShell";
import { MobilePopupCard } from "@/components/MobilePopupCard";
import type { Restaurant } from "@/types/restaurant";

const PANEL_TABS: { id: PanelId; icon: string; label: string }[] = [
  { id: "filter", icon: "⚙", label: "筛选" },
  { id: "stats", icon: "📊", label: "统计" },
  { id: "legend", icon: "🎨", label: "图例" },
];
interface MobileShellProps {
  headerContent: ReactNode;
  statusContent: ReactNode;
  mapRef: RefObject<MapShellHandle | null>;
  mapProps: MapShellProps;
  onLocate: (restaurant: Restaurant) => void;
  popupRestaurant: Restaurant | null;
  onClosePopup: () => void;
  searchKey: string;
  totalCount: number;
  geocodedCount: number;
}

/** Mobile layout consumes the same active dataset, filtered list and detail selection as desktop. */
export function MobileShell({
  headerContent, statusContent, mapRef, mapProps, onLocate,
  popupRestaurant, onClosePopup, searchKey, totalCount, geocodedCount,
}: MobileShellProps) {
  const { activePanel, toggle, close } = usePanelState();
  const [panelContext, setPanelContext] = useState(searchKey);
  if (panelContext !== searchKey) { setPanelContext(searchKey); close(); }
  const [displayMode, setDisplayMode] = useState<"marker" | "heat">("marker");
  const handleLocate = useCallback((restaurant: Restaurant) => {
    onLocate(restaurant);
    close();
  }, [onLocate, close]);
  const handleModeToggle = useCallback(() => { mapRef.current?.toggleMode(); }, [mapRef]);
  const panelTitles: Record<PanelId, string> = { filter: "筛选", stats: "区域统计", legend: "图例" };

  return <div className="mobile-shell">
    <Header subtitle="" compact>{headerContent}{statusContent}</Header>
    <div className="mobile-search-area" role="search" aria-label="餐厅搜索">
      <SearchBar key={searchKey} restaurants={mapProps.restaurants} onLocate={handleLocate} />
    </div>
    <main className="mobile-map-container">
      <MapShell ref={mapRef} {...mapProps} hideControls mobileDetails onModeChange={setDisplayMode} />
    </main>
    <div className="mobile-fab-group">
      {PANEL_TABS.map((tab) => <button key={tab.id} className={`mobile-fab-btn ${activePanel === tab.id ? "active" : ""}`}
        onClick={(event) => { event.currentTarget.focus(); toggle(tab.id); }} data-focus-key={`panel-${tab.id}`} aria-expanded={activePanel === tab.id} aria-controls={activePanel === tab.id ? "mobile-panel" : undefined} aria-haspopup="dialog" aria-label={tab.label}><span className="fab-icon">{tab.icon}</span></button>)}
    </div>
    <BottomSheet key={searchKey} id="mobile-panel" isOpen={activePanel !== null} title={activePanel ? panelTitles[activePanel] : undefined} onClose={close}>
      {activePanel === "filter" && <FilterPanel
        groups={mapProps.groups} dataGroups={mapProps.dataGroups} activeGroups={mapProps.activeGroups}
        onToggle={mapProps.onToggleGroup} onSelectAll={mapProps.onSelectAll} onDeselectAll={mapProps.onDeselectAll}
        filtersReady={mapProps.filtersReady} showStarFilter={mapProps.showStarFilter}
        starFilter={mapProps.starFilter} onStarFilterChange={mapProps.onStarFilterChange}
        diningCounts={mapProps.diningCounts} diningFilter={mapProps.diningFilter} onDiningFilterChange={mapProps.onDiningFilterChange}
        onModeToggle={handleModeToggle} currentMode={displayMode}
      />}
      {activePanel === "stats" && <StatsPanelReact restaurants={mapProps.visibleRestaurants} />}
      {activePanel === "legend" && <Legend groups={mapProps.groups} dataGroups={mapProps.dataGroups}
        totalCount={totalCount} geocodedCount={geocodedCount} compact />}
    </BottomSheet>
    {popupRestaurant && <MobilePopupCard restaurant={popupRestaurant} groups={mapProps.groups} spatialContext={mapProps.spatialContext} onClose={onClosePopup} />}
  </div>;
}
