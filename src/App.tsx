import { useRef, useCallback } from "react";
import { cities } from "@/config/cities";
import { useGuideData } from "@/hooks/useGuideData";
import { useFilters } from "@/hooks/useFilters";
import { MapShell } from "@/components/MapShell";
import type { MapShellHandle } from "@/components/MapShell";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { Legend } from "@/components/Legend";
import type { Restaurant } from "@/types/restaurant";

/** Root application shell. Wires data fetching, filtering, and the map. */
function App() {
  const city = cities[0]!;
  const guide = city.guides[0]!;
  const { data, loading, error } = useGuideData(guide.dataPath);
  const { activeGroups, toggle, enableGroup } = useFilters();
  const mapRef = useRef<MapShellHandle>(null);

  const title = `2026 香港米其林必比登餐厅地图 · ${data.length || "..."} 家高性价比美食`;
  const subtitle = loading
    ? "Loading..."
    : error
      ? `Error: ${error}`
      : `更新日期：2026-05-03 · 数据来源：MICHELIN Guide Hong Kong 2026`;

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

  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <main className="map-shell">
        <SearchBar restaurants={data} onLocate={handleLocate} />
        <MapShell
          ref={mapRef}
          restaurants={data}
          activeGroups={activeGroups}
          onToggleGroup={toggle}
          center={city.center}
          zoom={city.zoom}
        />
        <Legend totalCount={data.length} geocodedCount={geocodedCount} />
      </main>
    </>
  );
}

export default App;
