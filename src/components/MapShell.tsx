import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import type { Restaurant } from "@/types/restaurant";
import type { Map as LeafletMap, Marker, MarkerClusterGroup } from "leaflet";
import { createRestaurantMarker } from "./RestaurantMarker";
import { HeatLayerManager } from "./HeatLayer";
import { FilterPanel } from "./FilterPanel";
import { StatsPanelReact } from "./StatsPanelReact";

interface MapShellProps {
  restaurants: Restaurant[];
  activeGroups: Set<string>;
  onToggleGroup: (group: string) => void;
  center: [number, number];
  zoom: number;
  /** When true, skips creating Leaflet control portal containers for FilterPanel/StatsPanel. */
  hideControls?: boolean;
  /** Called whenever the display mode changes between marker and heat. */
  onModeChange?: (mode: "marker" | "heat") => void;
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
    { restaurants, activeGroups, onToggleGroup, center, zoom, hideControls, onModeChange },
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
    const activeGroupsRef = useRef(activeGroups);
    activeGroupsRef.current = activeGroups;
    const restaurantsRef = useRef(restaurants);
    restaurantsRef.current = restaurants;

    /** Visible restaurants based on active cuisine group filters. */
    const visibleRestaurants = useMemo(
      () => restaurants.filter((r) => activeGroups.has(r.cuisine_group)),
      [restaurants, activeGroups],
    );

    /** Refreshes visible markers/heat based on current filter and mode. */
    const refreshLayers = useCallback(() => {
      const map = mapRef.current;
      const cluster = clusterRef.current;
      const heat = heatRef.current;
      if (!map || !cluster || !heat) return;

      const visible = restaurantsRef.current.filter((r) =>
        activeGroupsRef.current.has(r.cuisine_group),
      );

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
        heat.show(visible);
      }
    }, []);

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

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: true,
        preferCanvas: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 48,
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

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, [center, zoom]);

    // Build markers when restaurants data changes
    useEffect(() => {
      markersRef.current.clear();
      restaurants.forEach((item) => {
        markersRef.current.set(item.id, createRestaurantMarker(item));
      });
      refreshLayers();
    }, [restaurants, refreshLayers]);

    // Refresh layers when activeGroups change
    useEffect(() => {
      refreshLayers();
    }, [activeGroups, refreshLayers]);

    /** Exposes flyToRestaurant and toggleMode for external integration. */
    useImperativeHandle(
      ref,
      () => ({
        flyToRestaurant(restaurant: Restaurant) {
          const map = mapRef.current;
          const cluster = clusterRef.current;
          if (!map || !cluster) return;

          if (modeRef.current === "heat") {
            modeRef.current = "marker";
            setMode("marker");
            refreshLayers();
          }

          map.flyTo([restaurant.lat, restaurant.lon], 15, { duration: 0.8 });
          const marker = markersRef.current.get(restaurant.id);
          if (marker) {
            setTimeout(() => marker.openPopup(), 400);
          }
        },
        toggleMode: handleModeToggle,
      }),
      [refreshLayers, handleModeToggle],
    );

    return (
      <>
        <div ref={containerRef} id="map" style={{ width: "100%", height: "100%" }} />
        {filterContainer &&
          createPortal(
            <FilterPanel
              activeGroups={activeGroups}
              onToggle={onToggleGroup}
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
      </>
    );
  },
);
