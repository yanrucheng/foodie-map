import { getBasemap, type BasemapId } from "@/config/basemaps";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import { focusBookmark } from "@/utils/focus";
import L from "@/lib/leaflet";
import type { Restaurant } from "@/types/restaurant";
import type { CuisineGroup, DiningCounts } from "@/config/restaurantPresentation";
import type { DiningFilter, StarFilter } from "@/hooks/useFilters";
import type { Map as LeafletMap, Marker, MarkerClusterGroup } from "leaflet";
import { createRestaurantMarker, popupHtml } from "./RestaurantMarker";
import { HeatLayerManager } from "./HeatLayer";
import { FilterPanel } from "./FilterPanel";
import { StatsPanelReact } from "./StatsPanelReact";
import { TileService, type TileStatus } from "./TileService";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { projectMapPosition } from "@/utils/mapPosition";
import { type SpatialContext } from "@/data/contract";

export interface MapShellProps {
  /** Authoritative filtered list supplied by useFilters. */
  visibleRestaurants: Restaurant[];
  groups: CuisineGroup[];
  restaurants: Restaurant[];
  /** Set of distinct cuisine_group keys present in the loaded data (for FilterPanel). */
  dataGroups: Set<string>;
  activeGroups: Set<string>;
  onToggleGroup: (group: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  filtersReady: boolean;
  showStarFilter: boolean;
  starFilter: StarFilter;
  onStarFilterChange: (filter: StarFilter) => void;
  diningFilter: DiningFilter;
  diningCounts: DiningCounts;
  onDiningFilterChange: (filter: DiningFilter) => void;
  center: [number, number];
  spatialContext?: SpatialContext;
  basemap?: BasemapId;
  zoom: number;
  /** When true, skips creating Leaflet control portal containers for FilterPanel/StatsPanel. */
  hideControls?: boolean;
  /** Called whenever the display mode changes between marker and heat. */
  onModeChange?: (mode: "marker" | "heat") => void;
  /** App owns selection across marker clicks, search, both detail layouts and dismissal. */
  /** A new selection object also represents reactivation of the same record. */
  selection: { record: Restaurant } | null;
  onRestaurantSelect: (restaurant: Restaurant) => void;
  onRestaurantClose: (restaurant: Restaurant) => void;
  mobileDetails?: boolean;
}

/** Imperative handle exposed by MapShell for external map interactions. */
export interface MapShellHandle {
  flyToRestaurant: (restaurant: Restaurant) => void;
  /** Toggles between marker and heat display mode. */
  toggleMode: () => void;
}

/**
 * Main map component. Initializes Leaflet map imperatively and manages
 * marker cluster, heat layer, and React portals for filter/stats panels.
 */
export const MapShell = forwardRef<MapShellHandle, MapShellProps>(
  function MapShell(
    { restaurants, visibleRestaurants, groups, dataGroups, activeGroups, onToggleGroup, onSelectAll, onDeselectAll, filtersReady, showStarFilter, starFilter, onStarFilterChange, diningFilter, diningCounts, onDiningFilterChange, center, zoom, spatialContext, basemap, hideControls, onModeChange, selection, onRestaurantSelect, onRestaurantClose, mobileDetails },
    ref,
  ) {
    const selectedRestaurant = selection?.record ?? null;
    const mapRef = useRef<LeafletMap | null>(null);
    const clusterRef = useRef<MarkerClusterGroup | null>(null);
    const heatRef = useRef<HeatLayerManager | null>(null);
    const markersRef = useRef<Map<number, Marker>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);

    // Display mode state — modeRef kept for synchronous reads in imperative code
    const [mode, setMode] = useState<"marker" | "heat">("marker");
    const modeRef = useRef(mode);
    modeRef.current = mode;

    // Portal containers for Leaflet-mounted React panels
    const [filterContainer, setFilterContainer] = useState<HTMLDivElement | null>(null);
    const [statsContainer, setStatsContainer] = useState<HTMLDivElement | null>(null);

    // Stable refs for callbacks that need current values without re-creation
    const visibleRef = useRef(visibleRestaurants);
    visibleRef.current = visibleRestaurants;
    const selectedRef = useRef(selectedRestaurant);
    selectedRef.current = selectedRestaurant && visibleRestaurants.includes(selectedRestaurant) ? selectedRestaurant : null;
    const onSelectRef = useRef(onRestaurantSelect);
    onSelectRef.current = onRestaurantSelect;
    const onCloseRef = useRef(onRestaurantClose);
    onCloseRef.current = onRestaurantClose;
    const detailPopupRef = useRef<{ record: Restaurant; popup: L.Popup } | null>(null);

    const { attachTo, locationMessage } = useLocationTracking();
    const tileRef = useRef<TileService | null>(null);
    const [tileStatus, setTileStatus] = useState<TileStatus>("loading");
    const context = spatialContext;
    const centerLat = center[0], centerLon = center[1];
    const projectedCenter = useMemo(() => projectMapPosition({ lat: centerLat, lon: centerLon }, context, basemap), [centerLat, centerLon, context, basemap]);

    // Clear ownership before removal: replacing a popup is not a user dismissal.
    const removeDetailPopup = useCallback(() => {
      const previous = detailPopupRef.current;
      detailPopupRef.current = null;
      previous?.popup.remove();
    }, []);

    const syncSelection = useCallback(() => {
      const selected = selectedRef.current;
      for (const [id, marker] of markersRef.current) {
        marker.getElement()?.classList.toggle("restaurant-marker--selected", selected?.id === id);
      }
      const map = mapRef.current;
      if (!map) return;
      if (detailPopupRef.current?.record === selected && detailPopupRef.current.popup.isOpen() && !mobileDetails) return;
      removeDetailPopup();
      if (!selected || mobileDetails) return;
      const position = projectMapPosition(selected, context, basemap);
      if (!position) return;
      // A spiderfied marker has a temporary display position; keep its popup beside it.
      const anchor = markersRef.current.get(selected.id)?.getLatLng() ?? position;
      const popup = L.popup({ autoPan: true, autoPanPaddingTopLeft: [280, 112], autoPanPaddingBottomRight: [240, 70], offset: [0, -38] }).setLatLng(anchor).setContent(popupHtml(selected, groups, context));
      detailPopupRef.current = { record: selected, popup };
      popup.openOn(map);
    }, [groups, context, basemap, mobileDetails, removeDetailPopup]);

    /** Refreshes visible markers/heat based on current filter and mode. */
    const refreshLayers = useCallback(() => {
      const map = mapRef.current;
      const cluster = clusterRef.current;
      const heat = heatRef.current;
      if (!map || !cluster || !heat) return;

      const visible = visibleRef.current;

      if (modeRef.current === "marker") {
        heat.remove();
        cluster.clearLayers();
        // Bulk insertion recalculates bounds and cluster icons once per filter change.
        cluster.addLayers(visible.map((item) => markersRef.current.get(item.id)).filter((marker): marker is Marker => marker !== undefined));
        if (!map.hasLayer(cluster)) map.addLayer(cluster);
      } else {
        if (map.hasLayer(cluster)) map.removeLayer(cluster);
        heat.show(visible, context, basemap);
      }
    }, [context, basemap]);

    /** Toggles between marker and heat display mode. */
    const handleModeToggle = useCallback(() => {
      const next = modeRef.current === "marker" ? "heat" : "marker";
      modeRef.current = next;
      setMode(next);
      refreshLayers();
      onModeChange?.(next);
    }, [refreshLayers, onModeChange]);

    // Initialize map once
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const provider = getBasemap(basemap);
      const map = L.map(containerRef.current, {
        // No guessed city center for an unknown/invalid context; retain a neutral world view.
        center: projectedCenter ?? [20, 0],
        zoom: Math.max(provider.minZoom, Math.min(provider.maxZoom, projectedCenter ? zoom : provider.minZoom)),
        minZoom: provider.minZoom, maxZoom: provider.maxZoom,
        zoomControl: true,
        // Dataset withdrawal must remove old popup DOM synchronously, not after a fade timer.
        fadeAnimation: false,
        preferCanvas: true,
      });

      let popupReturn: (() => void) | undefined;
      let popupElement: HTMLElement | undefined;
      const openPopup = (event: L.PopupEvent) => {
        popupReturn = focusBookmark();
        popupElement = event.popup.getElement();
        const heading = popupElement?.querySelector<HTMLElement>("h2");
        if (heading) { heading.tabIndex = -1; heading.focus(); }
        const close = popupElement?.querySelector<HTMLElement>(".leaflet-popup-close-button");
        close?.setAttribute("aria-label", "关闭餐厅详情");
      };
      const closePopup = (event: L.PopupEvent) => {
        const current = detailPopupRef.current;
        if (current?.popup === event.popup) {
          detailPopupRef.current = null;
          if (selectedRef.current === current.record) onCloseRef.current(current.record);
        }
        const restore = popupReturn;
        const ownedFocus = popupElement?.contains(document.activeElement) || document.activeElement === document.body;
        popupReturn = undefined; popupElement = undefined;
        if (ownedFocus) queueMicrotask(() => { if (!popupElement && !document.querySelector("dialog[open]")) restore?.(); });
      };
      const popupKey = (event: KeyboardEvent) => {
        if (event.key === "Escape" && popupElement?.contains(event.target as Node)) {
          event.preventDefault(); event.stopPropagation(); map.closePopup();
        }
      };
      map.on("popupopen", openPopup); map.on("popupclose", closePopup);
      map.getContainer().addEventListener("keydown", popupKey);

      const tiles = new TileService(map, setTileStatus, basemap);
      tileRef.current = tiles;

      // Add scale bar
      L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 48,
        // Keep coincident points expandable at max zoom, with room for 44px targets.
        spiderfyDistanceMultiplier: 2.4,
        iconCreateFunction: (c) =>
          L.divIcon({
            html: `<div class="cluster-badge" aria-label="${c.getChildCount()} 家餐厅，展开查看">${c.getChildCount()}</div>`,
            className: "",
            iconSize: [44, 44],
          }),
      });

      mapRef.current = map;
      clusterRef.current = cluster;
      heatRef.current = new HeatLayerManager(map);

      // Create placeholder L.Controls whose DOM containers host React portals
      if (!hideControls) {
        const FilterPlaceholder = L.Control.extend({
          options: { position: "topleft" as const },
          onAdd() {
            const el = L.DomUtil.create("div", "filter-control");
            L.DomEvent.disableClickPropagation(el);
            L.DomEvent.disableScrollPropagation(el);
            setFilterContainer(el);
            return el;
          },
        });
        map.addControl(new FilterPlaceholder());

        const StatsPlaceholder = L.Control.extend({
          options: { position: "topright" as const },
          onAdd() {
            const el = L.DomUtil.create("div");
            L.DomEvent.disableClickPropagation(el);
            L.DomEvent.disableScrollPropagation(el);
            setStatsContainer(el);
            return el;
          },
        });
        map.addControl(new StatsPlaceholder());
      }

      const detachLocation = attachTo(map, context, basemap);
      const markers = markersRef.current;
      return () => {
        detachLocation();
        tiles.remove();
        tileRef.current = null;
        heatRef.current?.remove();
        cluster.clearLayers();
        markers.clear();
        map.stop();
        // Leaflet 1.9.4 remove() leaves its 250ms zoom-transition fallback alive.
        // Retire that transition before it can read a pane deleted by this teardown.
        (map as LeafletMap & { _animatingZoom?: boolean })._animatingZoom = false;
        removeDetailPopup();
        map.closePopup();
        map.off("popupopen", openPopup); map.off("popupclose", closePopup);
        map.getContainer().removeEventListener("keydown", popupKey);
        map.remove();
        mapRef.current = null;
        clusterRef.current = null;
        heatRef.current = null;
        setFilterContainer(null);
        setStatsContainer(null);
      };
    }, [projectedCenter, zoom, hideControls, attachTo, context, basemap, removeDetailPopup]);

    // Withdraw old Leaflet content before a new title/data render can be painted.
    useLayoutEffect(() => {
      mapRef.current?.stop();
      removeDetailPopup();
      clusterRef.current?.clearLayers();
      heatRef.current?.remove();
    }, [restaurants, removeDetailPopup]);

    // Keep every restaurant in the list; create markers only for usable positions.
    useEffect(() => {
      removeDetailPopup();
      markersRef.current.clear();
      restaurants.forEach((item) => {
        const opts = { onClick: (record: Restaurant) => onSelectRef.current(record), groups, spatialContext: context, basemap };
        const marker = createRestaurantMarker(item, opts);
        if (marker) {
          // Cluster expansion recreates marker elements; always reapply the current selection.
          marker.on("add", () => marker.getElement()?.classList.toggle("restaurant-marker--selected", selectedRef.current === item));
          marker.on("move", () => {
            const current = detailPopupRef.current;
            if (current?.record === item) current.popup.setLatLng(marker.getLatLng());
          });
          markersRef.current.set(item.id, marker);
        }
      });
      refreshLayers();
      syncSelection();
    }, [restaurants, groups, refreshLayers, projectedCenter, zoom, hideControls, context, basemap, removeDetailPopup, syncSelection]);

    // Apply the shared filtered list before painting changed counts.
    useLayoutEffect(() => {
      refreshLayers();
    }, [visibleRestaurants, refreshLayers]);

    useLayoutEffect(() => { syncSelection(); }, [selection, visibleRestaurants, syncSelection]);

    /** Exposes flyToRestaurant and toggleMode for external integration. */
    useImperativeHandle(
      ref,
      () => ({
        flyToRestaurant(restaurant: Restaurant) {
          const map = mapRef.current;
          const cluster = clusterRef.current;
          if (!map || !cluster || !visibleRef.current.includes(restaurant)) return;
          const position = projectMapPosition(restaurant, context, basemap);
          if (!position) return;

          if (modeRef.current === "heat") {
            modeRef.current = "marker";
            setMode("marker");
            refreshLayers();
            onModeChange?.("marker");
          }

          map.flyTo(position, 15, { duration: 0.8 });
        },
        toggleMode: handleModeToggle,
      }),
      [refreshLayers, handleModeToggle, context, onModeChange, basemap],
    );

    return (
      <>
        <div ref={containerRef} id="map" role="region" aria-label="餐厅地图，可使用搜索查看餐厅详情" style={{ width: "100%", height: "100%" }} />
        {filterContainer &&
          createPortal(
            <FilterPanel
              groups={groups}
              dataGroups={dataGroups}
              activeGroups={activeGroups}
              onToggle={onToggleGroup}
              onSelectAll={onSelectAll} onDeselectAll={onDeselectAll}
              filtersReady={filtersReady} showStarFilter={showStarFilter}
              starFilter={starFilter} onStarFilterChange={onStarFilterChange}
              diningFilter={diningFilter}
              diningCounts={diningCounts}
              onDiningFilterChange={onDiningFilterChange}
              onModeToggle={handleModeToggle}
              currentMode={mode}
            />,
            filterContainer,
          )}
        {statsContainer &&
          createPortal(
            <StatsPanelReact restaurants={visibleRestaurants} />,
            statsContainer,
          )}
        {locationMessage && <div className="loc-error-toast" role="status">{locationMessage} 仍可搜索和查看餐厅。</div>}
        {tileStatus === "unavailable" && <div className="map-service-status" role="status">
          地图服务暂不可用，餐厅信息仍可搜索和查看。
          <button onClick={() => tileRef.current?.retry()}>重试地图</button>
        </div>}
        {!projectedCenter && <div className="map-spatial-status" role="status">此数据集的空间信息暂不可用，仍可搜索和查看餐厅。</div>}
      </>
    );
  },
);
