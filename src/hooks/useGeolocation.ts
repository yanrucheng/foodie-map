import { useState, useEffect, useCallback, useRef } from "react";
import type { GeolocationState } from "../types/geolocation";
import { isGeolocationSupported } from "../utils/permissions";

/** Minimum movement in meters before updating state (reduces jitter). */
const MIN_MOVEMENT_THRESHOLD = 3;

/** Options passed to watchPosition for high-accuracy GPS. */
const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
};

/** Haversine distance between two coordinates in meters. */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reactive hook that wraps navigator.geolocation.watchPosition.
 * Exposes live position state with jitter filtering (minimum movement threshold).
 * Automatically cleans up the watcher on unmount or when stopped.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lon: null,
    accuracy: null,
    isActive: false,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);

  /** Handles incoming position updates with jitter filtering. */
  const onPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const last = lastPosRef.current;

    // Skip update if movement is below threshold (reduces jittery re-renders)
    if (last) {
      const moved = haversineMeters(last.lat, last.lon, latitude, longitude);
      if (moved < MIN_MOVEMENT_THRESHOLD) return;
    }

    lastPosRef.current = { lat: latitude, lon: longitude };
    setState({
      lat: latitude,
      lon: longitude,
      accuracy: accuracy,
      isActive: true,
      error: null,
    });
  }, []);

  /** Handles geolocation errors. */
  const onError = useCallback((err: GeolocationPositionError) => {
    setState((prev) => ({ ...prev, error: err }));
  }, []);

  /** Starts the position watcher. No-op if already active or API unavailable. */
  const start = useCallback(() => {
    if (watchIdRef.current !== null) return;
    if (!isGeolocationSupported()) {
      setState((prev) => ({ ...prev, error: null, isActive: false }));
      return;
    }

    setState((prev) => ({ ...prev, isActive: true, error: null }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      onError,
      WATCH_OPTIONS,
    );
  }, [onPosition, onError]);

  /** Stops the position watcher and resets state. */
  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastPosRef.current = null;
    setState({
      lat: null,
      lon: null,
      accuracy: null,
      isActive: false,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...state, start, stop };
}
