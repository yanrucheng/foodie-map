import { useRef, useCallback, useEffect, useState, lazy, Suspense } from "react";
import { useSelection } from "@/hooks/useSelection";
import { useGuideData } from "@/hooks/useGuideData";
import { useFilters } from "@/hooks/useFilters";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { useViewport } from "@/hooks/useViewport";
import { MapShell, type MapShellHandle } from "@/components/MapShell";
import { Header } from "@/components/Header";
import { DynamicTitle } from "@/components/DynamicTitle";
import { SearchBar } from "@/components/SearchBar";
import { Legend } from "@/components/Legend";
import { MobilePopupCard } from "@/components/MobilePopupCard";
import type { Restaurant } from "@/types/restaurant";
import { getMapPosition } from "@/data/contract";
import { cities, type CityConfig } from "@/config/cities";
import { release } from "@/data/release";
import { useReleaseStatus } from "@/hooks/useReleaseStatus";

const MobileShell = lazy(() => import("@/components/MobileShell").then((m) => ({ default: m.MobileShell })));

/** Selection and its resource are the single source for both layouts. */
function App({ registry = cities }: { registry?: CityConfig[] }) {
  useVisualViewport();
  const connectivity = useReleaseStatus();
  const selection = useSelection(registry);
  const { city, guide } = selection;
  // Formal catalog supplies references; injected UI fixtures may use the established convention.
  const taxonomyPath = city ? city.taxonomyPath ?? `/data/taxonomy/${city.id}.json` : "";
  const resource = useGuideData(guide?.dataPath ?? null, city && guide ? {
    cityId: city.id, guideId: guide.id, year: guide.year, taxonomyPath, mappingsPath: city.mappingsPath, spatialContext: city.spatialContext,
  } : undefined);
  const { data, groups, requestKey, status, retry } = resource;
  const offline = !connectivity.online || resource.offline;
  const filters = useFilters(data, requestKey, city?.spatialContext);
  const { visibleRestaurants, mappableRestaurants } = filters;
  const { isMobile } = useViewport();
  const mapRef = useRef<MapShellHandle>(null);
  const [detail, setDetail] = useState<{ requestKey: string; record: Restaurant } | null>(null);
  const [pendingLocate, setPendingLocate] = useState<{ requestKey: string; record: Restaurant } | null>(null);
  const popupRestaurant = detail?.requestKey === requestKey && visibleRestaurants.includes(detail.record) ? detail.record : null;
  const closeDetail = useCallback(() => { setDetail(null); setPendingLocate(null); }, []);
  const closeMapDetail = useCallback((record: Restaurant) => {
    setDetail((current) => current?.record === record ? null : current);
  }, []);
  useEffect(() => {
    if (detail && !popupRestaurant) setDetail(null);
  }, [detail, popupRestaurant]);
  const showDetail = useCallback((record: Restaurant) => {
    if (data.includes(record)) setDetail({ requestKey, record });
  }, [data, requestKey]);
  const handleLocate = useCallback((record: Restaurant) => {
    if (!data.includes(record)) return;
    filters.reveal(record);
    setDetail({ requestKey, record });
    setPendingLocate({ requestKey, record });
  }, [data, filters, requestKey]);

  // Runs after child layers commit the revealed filters. No timer races or hidden marker lookup.
  useEffect(() => {
    if (pendingLocate?.requestKey === requestKey && visibleRestaurants.includes(pendingLocate.record)) {
      mapRef.current?.flyToRestaurant(pendingLocate.record);
      setPendingLocate(null);
    }
  }, [pendingLocate, requestKey, visibleRestaurants]);

  useEffect(() => {
    document.title = city && guide ? `${guide.year} ${city.labelZh} · ${guide.labelZh}餐厅地图` : "Foodie Map · 暂无可用榜单";
  }, [city, guide]);

  if (!city || !guide || selection.year == null) {
    return <main className="dataset-unavailable" role="status">暂无可用榜单，请稍后重新加载。</main>;
  }

  const subtitle = status === "loading" ? "正在加载所选版次…"
    : status === "error" ? offline ? "离线：此版次尚未缓存，联网后可重试。" : "数据不可用，请重试。"
    : status === "empty" ? "本版暂无收录餐厅，可选择其他城市或版次。"
    : `收录 ${data.length} · 筛选结果 ${visibleRestaurants.length} · 筛选内可定位 ${mappableRestaurants.length}`;
  const statusContent = <div className="dataset-status" data-state={status} data-dataset={selection.datasetKey}
    data-coverage={guide.coverage?.status} data-build={release?.buildId} data-revision={release?.resources[guide.dataPath]?.sha256} data-delivery={resource.delivery}
    title={release ? `Foodie Map ${release.version} · 构建 ${release.buildId.slice(0, 12)} · 数据 ${release.dataRevision.slice(0, 12)}` : undefined}
    role={status === "error" ? "alert" : "status"}>
    {subtitle}{guide.coverage && (status === "ready" || status === "empty") && <span title={`${city.scope?.description ?? ""} ${guide.coverage.note}`}> · {({ verified: "名单已核验", partial: "部分名单", unverified: "名单未核验", "not-collected": "尚未采集" })[guide.coverage.status]}{status === "empty" && guide.coverage.status !== "verified" && "（空文件不代表官方零收录）"}</span>}{status === "ready" && visibleRestaurants.length === 0 && "。当前筛选没有餐厅，请调整主打体验或菜系与品类。"} {(status === "error" || resource.offline) && <button onClick={retry}>重试</button>}
    {release && <span className="release-status">{offline && status !== "error" ? "离线浏览 · 使用已缓存版次" : resource.delivery === "cache" ? "使用已验证缓存" : ""}{connectivity.waiting && " · 更新已就绪，关闭本应用所有页面后重新打开。"}</span>}
  </div>;
  const titleElement = <DynamicTitle key={selection.datasetKey}
    years={selection.years} cityOptions={selection.cityOptions} guideOptions={selection.guideOptions}
    year={selection.year} cityId={selection.cityId} guideId={selection.guideId}
    onYearChange={selection.setYear} onCityChange={selection.setCity} onGuideChange={selection.setGuide} compact={isMobile}
  />;
  const sharedMapProps = {
    restaurants: data, visibleRestaurants, groups,
    selection: popupRestaurant ? detail : null, onRestaurantSelect: showDetail, onRestaurantClose: closeMapDetail,
    dataGroups: filters.dataGroups, activeGroups: filters.activeGroups,
    onToggleGroup: filters.toggle, onToggleAll: filters.toggleAll,
    diningCounts: filters.diningCounts, diningFilter: filters.diningFilter, onDiningFilterChange: filters.setDiningFilter,
    center: city.center, zoom: city.zoom, spatialContext: city.spatialContext, basemap: city.basemap,
  };
  const geocodedCount = data.filter((record) => getMapPosition(record, city.spatialContext) !== null).length;

  if (isMobile) {
    return <Suspense fallback={<div role="status">正在加载移动视图…</div>}>
      <MobileShell
        headerContent={titleElement} statusContent={statusContent}
        mapRef={mapRef} mapProps={sharedMapProps} onLocate={handleLocate}
        popupRestaurant={popupRestaurant} onClosePopup={closeDetail}
        searchKey={requestKey} totalCount={data.length} geocodedCount={geocodedCount}
      />
    </Suspense>;
  }

  return <>
    <Header subtitle="">{titleElement}{statusContent}</Header>
    <main className="map-shell">
      <SearchBar key={requestKey} restaurants={data} onLocate={handleLocate} />
      <MapShell ref={mapRef} {...sharedMapProps} />
      <Legend groups={groups} dataGroups={filters.dataGroups} totalCount={data.length} geocodedCount={geocodedCount} />
      {popupRestaurant && !getMapPosition(popupRestaurant, city.spatialContext) && <MobilePopupCard restaurant={popupRestaurant} groups={groups} spatialContext={city.spatialContext} onClose={closeDetail} modal={false} />}
    </main>
  </>;
}

export default App;
