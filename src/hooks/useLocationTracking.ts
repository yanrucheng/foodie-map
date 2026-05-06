import { useEffect, useRef, useCallback, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { LocationButton } from "@/components/LocationButton";
import { UserLocationMarker } from "@/components/UserLocationMarker";
import { useGeolocation } from "./useGeolocation";
import { useDeviceOrientation } from "./useDeviceOrientation";
import { wgs84ToGcj02 } from "@/utils/gcj02";

/** Auto-stop timeout duration (5 minutes). */
const AUTO_STOP_MS = 5 * 60 * 1000;

/**
 * Encapsulates all live location tracking logic: geolocation watching,
 * device orientation, auto-stop timer, visibility-change pause/resume,
 * and the UserLocationMarker lifecycle. Returns refs and handlers needed
 * by the parent MapShell component to wire up the LocationButton control.
 */
export function useLocationTracking(mapRef: React.RefObject<LeafletMap | null>) {
  const geo = useGeolocation();
  const orientation = useDeviceOrientation();
  const locationBtnRef = useRef<LocationButton | null>(null);
  const locationMarkerRef = useRef<UserLocationMarker | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTrackingRef = useRef(false);

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

    const messages: Record<number, string> = {
      1: "Location permission denied",
      2: "Location unavailable",
      3: "Location request timed out",
    };
    const msg = messages[geo.error.code] ?? "Location error";

    locationBtnRef.current?.setState("inactive");
    orientation.stop();
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
      mapRef.current.flyTo(wgs84ToGcj02(geo.lat, geo.lon), 15, { duration: 0.6 });
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

  return {
    locationBtnRef,
    handleLocationActivate,
    handleLocationDeactivate,
    locationError,
  };
}
