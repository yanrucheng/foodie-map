import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import type { Restaurant } from "@/types/restaurant";
import type { Map as LeafletMap, Marker, Control, MarkerClusterGroup } from "leaflet";
import { createRestaurantMarker } from "./RestaurantMarker";
import { HeatLayerManager } from "./HeatLayer";
import { createFilterControl } from "./FilterControl";
import { createStatsPanel } from "./StatsPanel";

interface MapShellProps {
  restaurants: Restaurant[];
  activeGroups: Set<string>;
  onToggleGroup: (group: string) => void;
  center: [number, number];
  zoom: number;
}

/** Imperative handle exposed by MapShell for external map interactions. */
export interface MapShellHandle {
  flyToRestaurant: (restaurant: Restaurant) => void;
}

/**
 * Main map component. Initializes Leaflet map imperatively and manages
 * marker cluster, heat layer, filter control, and stats panel.
 */
export const MapShell = forwardRef<MapShellHandle, MapShellProps>(function MapShell({ restaurants, activeGroups, onToggleGroup, center, zoom }, ref) {
  const mapRef = useRef<LeafletMap | null>(null);
  const clusterRef = useRef<MarkerClusterGroup | null>(null);
  const heatRef = useRef<HeatLayerManager | null>(null);
  const markersRef = useRef<Map<number, Marker>>(new Map());
  const modeRef = useRef<"marker" | "heat">("marker");
  const filterControlRef = useRef<Control | null>(null);
  const statsPanelRef = useRef<{ control: Control; update: (r: Restaurant[]) => void } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable callbacks via refs to avoid re-init
  const activeGroupsRef = useRef(activeGroups);
  activeGroupsRef.current = activeGroups;
  const restaurantsRef = useRef(restaurants);
  restaurantsRef.current = restaurants;
  const onToggleGroupRef = useRef(onToggleGroup);
  onToggleGroupRef.current = onToggleGroup;

  /** Refreshes visible markers/heat based on current filter and mode. */
  const refreshLayers = useCallback(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    const heat = heatRef.current;
    if (!map || !cluster || !heat) return;

    const visible = restaurantsRef.current.filter((r) =>
      activeGroupsRef.current.has(r.cuisine_group)
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

    statsPanelRef.current?.update(visible);
  }, []);

  /** Toggles between marker and heat mode. */
  const handleModeToggle = useCallback(() => {
    modeRef.current = modeRef.current === "marker" ? "heat" : "marker";
    // Re-render filter control to reflect mode label
    rebuildFilterControl();
    refreshLayers();
  }, [refreshLayers]);

  /** Rebuilds filter control to sync checkbox state and mode label. */
  const rebuildFilterControl = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (filterControlRef.current) {
      map.removeControl(filterControlRef.current);
    }
    filterControlRef.current = createFilterControl(
      activeGroupsRef.current,
      (group) => onToggleGroupRef.current(group),
      handleModeToggle,
      modeRef.current
    );
    map.addControl(filterControlRef.current);
  }, [handleModeToggle]);

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

    // Stats panel
    const statsPanel = createStatsPanel();
    statsPanelRef.current = statsPanel;
    map.addControl(statsPanel.control);

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

  // Rebuild filter control and refresh layers when activeGroups change
  useEffect(() => {
    rebuildFilterControl();
    refreshLayers();
  }, [activeGroups, rebuildFilterControl, refreshLayers]);

  /** Exposes flyToRestaurant for search integration. Switches to marker mode, flies, and opens popup. */
  useImperativeHandle(ref, () => ({
    flyToRestaurant(restaurant: Restaurant) {
      const map = mapRef.current;
      const cluster = clusterRef.current;
      if (!map || !cluster) return;

      // Switch to marker mode if in heat mode
      if (modeRef.current === "heat") {
        modeRef.current = "marker";
        rebuildFilterControl();
        refreshLayers();
      }

      map.flyTo([restaurant.lat, restaurant.lon], 15, { duration: 0.8 });
      const marker = markersRef.current.get(restaurant.id);
      if (marker) {
        setTimeout(() => marker.openPopup(), 400);
      }
    },
  }), [rebuildFilterControl, refreshLayers]);

  return <div ref={containerRef} id="map" style={{ width: "100%", height: "100%" }} />;
});
