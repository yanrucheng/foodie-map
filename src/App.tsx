import { useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { useSelection } from "@/hooks/useSelection";
import { useGuideData } from "@/hooks/useGuideData";
import { useFilters } from "@/hooks/useFilters";
import { useViewport } from "@/hooks/useViewport";
import { MapShell } from "@/components/MapShell";
import type { MapShellHandle } from "@/components/MapShell";
import { Header } from "@/components/Header";
import { DynamicTitle } from "@/components/DynamicTitle";
import { SearchBar } from "@/components/SearchBar";
import { Legend } from "@/components/Legend";
import type { Restaurant } from "@/types/restaurant";

/** Lazy-load MobileShell — only fetched on mobile viewports. */
const MobileShell = lazy(() =>
  import("@/components/MobileShell").then((m) => ({ default: m.MobileShell }))
);

/** Root application shell. Drives data fetch from the active selection. */
function App() {
  const selection = useSelection();
  const { city, guide } = selection;
  const { data, loading, error } = useGuideData(guide.dataPath);
  const { dataGroups, activeGroups, toggle, toggleAll, enableGroup, venueFilter, setVenueFilter } = useFilters(data);
  const { isMobile } = useViewport();
  const mapRef = useRef<MapShellHandle>(null);

  const subtitle = loading
    ? "Loading..."
    : error
      ? `Error: ${error}`
      : `${data.length} 家餐厅 · 数据来源：${guide.label}`;

  /** Sync document <title> with the active selection. */
  useEffect(() => {
    document.title = `${selection.year} ${city.labelZh} · ${guide.labelZh}餐厅地图`;
  }, [selection.year, city.labelZh, guide.labelZh]);



  /** Handles search locate: enables group filter if needed, then flies to marker. */
  const handleLocate = useCallback(
    (restaurant: Restaurant) => {
      if (!activeGroups.has(restaurant.cuisine_group)) {
        enableGroup(restaurant.cuisine_group);
      }
      mapRef.current?.flyToRestaurant(restaurant);
    },
    [activeGroups, enableGroup]
  );

  const geocodedCount = data.filter((r) => r.geocode_success).length;

  /** Shared DynamicTitle element used in both desktop and mobile layouts. */
  const titleElement = (
    <DynamicTitle
      years={selection.years}
      cityOptions={selection.cityOptions}
      guideOptions={selection.guideOptions}
      year={selection.year}
      cityId={selection.cityId}
      guideId={selection.guideId}
      onYearChange={selection.setYear}
      onCityChange={selection.setCity}
      onGuideChange={selection.setGuide}
      compact={isMobile}
    />
  );

  // Mobile layout — lazy-loaded full-screen map with bottom sheet panels
  if (isMobile) {
    return (
      <Suspense fallback={<MobileLoadingShell />}>
        <MobileShell
          headerContent={titleElement}
          subtitle={subtitle}
          restaurants={data}
          dataGroups={dataGroups}
          activeGroups={activeGroups}
          onToggle={toggle}
          onToggleAll={toggleAll}
          enableGroup={enableGroup}
          venueFilter={venueFilter}
          onVenueFilterChange={setVenueFilter}
          totalCount={data.length}
          geocodedCount={geocodedCount}
          center={city.center}
          zoom={city.zoom}
        />
      </Suspense>
    );
  }

  // Desktop layout — traditional sidebar panels via Leaflet portals
  return (
    <>
      <Header subtitle={subtitle}>
        {titleElement}
      </Header>
      <main className="map-shell">
        <SearchBar restaurants={data} onLocate={handleLocate} />
        <MapShell
          ref={mapRef}
          restaurants={data}
          dataGroups={dataGroups}
          activeGroups={activeGroups}
          onToggleGroup={toggle}
          onToggleAll={toggleAll}
          venueFilter={venueFilter}
          onVenueFilterChange={setVenueFilter}
          center={city.center}
          zoom={city.zoom}
        />
        <Legend dataGroups={dataGroups} totalCount={data.length} geocodedCount={geocodedCount} />
      </main>
    </>
  );
}

/** Minimal loading shell shown while MobileShell chunk is fetched. */
function MobileLoadingShell() {
  return (
    <div className="mobile-shell" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading...</div>
    </div>
  );
}

export default App;
