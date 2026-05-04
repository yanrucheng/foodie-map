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
import type { VenueFilter } from "@/hooks/useFilters";
import type { Map as LeafletMap, Marker, MarkerClusterGroup } from "leaflet";
import { createRestaurantMarker } from "./RestaurantMarker";
import { HeatLayerManager } from "./HeatLayer";
import { FilterPanel } from "./FilterPanel";
import { StatsPanelReact } from "./StatsPanelReact";
import { LocationButton } from "./LocationButton";
import { UserLocationMarker } from "./UserLocationMarker";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";

interface MapShellProps {
  restaurants: Restaurant[];
  /** Set of distinct cuisine_group keys present in the loaded data (for FilterPanel). */
  dataGroups: Set<string>;
  activeGroups: Set<string>;
  onToggleGroup: (group: string) => void;
  venueFilter: VenueFilter;
  onVenueFilterChange: (filter: VenueFilter) => void;
  center: [number, number];
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
    { restaurants, dataGroups, activeGroups, onToggleGroup, venueFilter, onVenueFilterChange, center, zoom, hideControls, onModeChange, onMarkerTap },
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
    const venueFilterRef = useRef(venueFilter);
    venueFilterRef.current = venueFilter;
    const restaurantsRef = useRef(restaurants);
    restaurantsRef.current = restaurants;
    const onMarkerTapRef = useRef(onMarkerTap);
    onMarkerTapRef.current = onMarkerTap;

    // ── Live location tracking ──
    const geo = useGeolocation();
    const orientation = useDeviceOrientation();
    const locationBtnRef = useRef<LocationButton | null>(null);
    const locationMarkerRef = useRef<UserLocationMarker | null>(null);
    const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasTrackingRef = useRef(false);

    /** Auto-stop timeout duration (5 minutes). */
    const AUTO_STOP_MS = 5 * 60 * 1000;

    /** Resets the auto-stop inactivity timer. */
    const resetAutoStop = useCallback(() => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = setTimeout(() => {
        geo.stop();
        orientation.stop();
        locationBtnRef.current?.setState("inactive");
        locationMarkerRef.current?.remove();
      }, AUTO_STOP_MS);
    }, [geo, orientation]);

    /** Activate: starts geolocation + orientation from user gesture. */
    const handleLocationActivate = useCallback(() => {
      geo.start();
      orientation.start();
      resetAutoStop();
    }, [geo, orientation, resetAutoStop]);

    /** Deactivate: stops all tracking, removes marker. */
    const handleLocationDeactivate = useCallback(() => {
      geo.stop();
      orientation.stop();
      locationMarkerRef.current?.remove();
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
    }, [geo, orientation]);

    // State for location error feedback
    const [locationError, setLocationError] = useState<string | null>(null);

    // Handle geolocation errors — reset button and show feedback
    useEffect(() => {
      if (!geo.error) return;

      // Map error codes to user-friendly messages
      const messages: Record<number, string> = {
        1: "Location permission denied",
        2: "Location unavailable",
        3: "Location request timed out",
      };
      const msg = messages[geo.error.code] ?? "Location error";

      // Reset button to inactive
      locationBtnRef.current?.setState("inactive");
      // Stop orientation tracking as well
      orientation.stop();
      // Show brief error message
      setLocationError(msg);
      const timer = setTimeout(() => setLocationError(null), 3000);
      return () => clearTimeout(timer);
    }, [geo.error, orientation]);

    // Sync geolocation & orientation state → UserLocationMarker
    useEffect(() => {
      if (!mapRef.current) return;
      if (geo.lat === null || geo.lon === null || geo.accuracy === null) return;

      // Transition button from "locating" to "tracking" on first fix
      if (locationBtnRef.current?.getState() === "locating") {
        locationBtnRef.current.setState("tracking");
        // Pan map to user location on first fix
        mapRef.current.flyTo([geo.lat, geo.lon], 15, { duration: 0.6 });
      }

      // Create marker instance lazily
      if (!locationMarkerRef.current) {
        locationMarkerRef.current = new UserLocationMarker(mapRef.current);
      }

      locationMarkerRef.current.update({
        lat: geo.lat,
        lon: geo.lon,
        accuracy: geo.accuracy,
        heading: orientation.heading,
      });

      // Reset auto-stop timer on each position update
      resetAutoStop();
    }, [geo.lat, geo.lon, geo.accuracy, orientation.heading, resetAutoStop]);

    // Pause/resume on visibility change (battery preservation)
    useEffect(() => {
      const handleVisibility = () => {
        if (document.hidden) {
          if (geo.isActive) {
            wasTrackingRef.current = true;
            geo.stop();
            orientation.stop();
          }
        } else {
          if (wasTrackingRef.current) {
            wasTrackingRef.current = false;
            geo.start();
            orientation.start();
            resetAutoStop();
          }
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [geo, orientation, resetAutoStop]);

    // Cleanup auto-stop timer on unmount
    useEffect(() => {
      return () => {
        if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      };
    }, []);

    /** Visible restaurants based on active cuisine group and venue type filters. */
    const visibleRestaurants = useMemo(
      () => restaurants.filter((r) =>
        activeGroups.has(r.cuisine_group) &&
        (venueFilter === "all" || r.venue_type === venueFilter)
      ),
      [restaurants, activeGroups, venueFilter],
    );

    /** Refreshes visible markers/heat based on current filter and mode. */
    const refreshLayers = useCallback(() => {
      const map = mapRef.current;
      const cluster = clusterRef.current;
      const heat = heatRef.current;
      if (!map || !cluster || !heat) return;

      const visible = restaurantsRef.current.filter((r) =>
        activeGroupsRef.current.has(r.cuisine_group) &&
        (venueFilterRef.current === "all" || r.venue_type === venueFilterRef.current),
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

      // Add location button control
      const locBtn = new LocationButton({
        onActivate: () => handleLocationActivate(),
        onDeactivate: () => handleLocationDeactivate(),
      });
      locBtn.addTo(map, "bottomright");
      locationBtnRef.current = locBtn;

      return () => {
        locBtn.remove(map);
        locationBtnRef.current = null;
        locationMarkerRef.current?.remove();
        locationMarkerRef.current = null;
        map.remove();
        mapRef.current = null;
      };
    }, [center, zoom]);

    // Build markers when restaurants data changes
    useEffect(() => {
      markersRef.current.clear();
      restaurants.forEach((item) => {
        const opts = onMarkerTapRef.current
          ? { onClick: onMarkerTapRef.current }
          : undefined;
        markersRef.current.set(item.id, createRestaurantMarker(item, opts));
      });
      refreshLayers();
    }, [restaurants, refreshLayers]);

    // Refresh layers when activeGroups or venueFilter change
    useEffect(() => {
      refreshLayers();
    }, [activeGroups, venueFilter, refreshLayers]);

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
              dataGroups={dataGroups}
              activeGroups={activeGroups}
              onToggle={onToggleGroup}
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
        {locationError && (
          <div className="loc-error-toast">{locationError}</div>
        )}
      </>
    );
  },
);
