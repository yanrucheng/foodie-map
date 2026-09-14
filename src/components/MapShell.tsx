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
import type { CuisineGroup } from "@/config/cuisineRegistry";
import type { VenueFilter } from "@/hooks/useFilters";
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
  onToggleAll: () => void;
  venueFilter: VenueFilter;
  onVenueFilterChange: (filter: VenueFilter) => void;
  center: [number, number];
  spatialContext?: SpatialContext;
  basemap?: BasemapId;
  zoom: number;
  /** When true, skips creating Leaflet control portal containers for FilterPanel/StatsPanel. */
  hideControls?: boolean;
  /** Called whenever the display mode changes between marker and heat. */
  onModeChange?: (mode: "marker" | "heat") => void;
  /** When provided (mobile), marker taps call this instead of opening Leaflet popup. */
  onMarkerTap?: (restaurant: Restaurant) => void;
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
    { restaurants, visibleRestaurants, groups, dataGroups, activeGroups, onToggleGroup, onToggleAll, venueFilter, onVenueFilterChange, center, zoom, spatialContext, basemap, hideControls, onModeChange, onMarkerTap },
    ref,
  ) {
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
    const onMarkerTapRef = useRef(onMarkerTap);
    onMarkerTapRef.current = onMarkerTap;

    const { attachTo, locationMessage } = useLocationTracking();
    const tileRef = useRef<TileService | null>(null);
    const [tileStatus, setTileStatus] = useState<TileStatus>("loading");
    const context = spatialContext;
    const centerLat = center[0], centerLon = center[1];
    const projectedCenter = useMemo(() => projectMapPosition({ lat: centerLat, lon: centerLon }, context, basemap), [centerLat, centerLon, context, basemap]);

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
        visible.forEach((item) => {
          const marker = markersRef.current.get(item.id);
          if (marker) cluster.addLayer(marker);
        });
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
      const closePopup = () => {
        const restore = popupReturn;
        const ownedFocus = popupElement?.contains(document.activeElement) || document.activeElement === document.body;
        popupReturn = undefined; popupElement = undefined;
        if (ownedFocus) queueMicrotask(() => { if (!document.querySelector("dialog[open]")) restore?.(); });
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
        disableClusteringAtZoom: 17,
        iconCreateFunction: (c) =>
          L.divIcon({
            html: `<div class="cluster-badge">${c.getChildCount()}</div>`,
            className: "",
            iconSize: [42, 42],
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
            const el = L.DomUtil.create("div");
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
    }, [projectedCenter, zoom, hideControls, attachTo, context, basemap]);

    // Withdraw old Leaflet content before a new title/data render can be painted.
    useLayoutEffect(() => {
      mapRef.current?.stop();
      mapRef.current?.closePopup();
      clusterRef.current?.clearLayers();
      heatRef.current?.remove();
    }, [restaurants]);

    // Keep every restaurant in the list; create markers only for usable positions.
    useEffect(() => {
      mapRef.current?.closePopup();
      markersRef.current.clear();
      restaurants.forEach((item) => {
        const opts = { onClick: onMarkerTapRef.current, groups, spatialContext: context, basemap };
        const marker = createRestaurantMarker(item, opts);
        if (marker) markersRef.current.set(item.id, marker);
      });
      refreshLayers();
    }, [restaurants, groups, refreshLayers, projectedCenter, zoom, hideControls, context, basemap]);

    // Apply the shared filtered list before painting changed counts.
    useLayoutEffect(() => {
      refreshLayers();
    }, [visibleRestaurants, refreshLayers]);

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
          // P04 already selected the mobile detail. Desktop opens the selected fact at its
          // coordinate without markercluster's uncancellable moveend/spiderfy continuation.
          // This also works when several restaurants share one coordinate.
          if (!onMarkerTapRef.current && visibleRef.current.includes(restaurant)) {
            map.openPopup(popupHtml(restaurant, groups, context), position, { autoPan: false });
          }
        },
        toggleMode: handleModeToggle,
      }),
      [refreshLayers, handleModeToggle, context, onModeChange, groups, basemap],
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
              onToggleAll={onToggleAll}
              venueFilter={venueFilter}
              onVenueFilterChange={onVenueFilterChange}
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
