import { cities } from "@/config/cities";
import { useGuideData } from "@/hooks/useGuideData";
import { useFilters } from "@/hooks/useFilters";
import { MapShell } from "@/components/MapShell";

/** Root application shell. Wires data fetching, filtering, and the map. */
function App() {
  const city = cities[0]!;
  const guide = city.guides[0]!;
  const { data, loading, error } = useGuideData(guide.dataPath);
  const { activeGroups, toggle } = useFilters();

  const subtitle = loading
    ? "Loading..."
    : error
      ? `Error: ${error}`
      : `${guide.label} · ${data.length} 家高性价比美食`;

  return (
    <>
      <header className="header">
        <h1 className="title">2026 香港米其林必比登餐厅地图 · {data.length || "..."} 家高性价比美食</h1>
        <p className="subtitle">{subtitle}</p>
      </header>
      <main className="map-shell">
        <MapShell
          restaurants={data}
          activeGroups={activeGroups}
          onToggleGroup={toggle}
          center={city.center}
          zoom={city.zoom}
        />
      </main>
    </>
  );
}

export default App;
