import { useCallback, useEffect, useRef } from "react";
import { isGeolocationSupported } from "@/utils/permissions";

export interface PositionFix { lat: number; lon: number; accuracy: number }
export interface LocationFailure { code: number; message: string }
const WATCH_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 };

/** Owns one browser watch. Each start/stop invalidates even already-queued callbacks. */
export function useGeolocation() {
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
  }, []);
  const start = useCallback((onPosition: (fix: PositionFix) => void, onError: (error: LocationFailure) => void) => {
    stop();
    const token = generation.current;
    if (!isGeolocationSupported()) {
      onError({ code: 0, message: "此浏览器不支持定位。" });
      return;
    }
    try {
      const id = navigator.geolocation.watchPosition((position) => {
        if (token !== generation.current) return;
        const { latitude: lat, longitude: lon, accuracy } = position.coords;
        // Keep accuracy-only updates. Rendering is cheap; dropping these preserves stale circles.
        onPosition({ lat, lon, accuracy });
      }, (error) => {
        if (token !== generation.current) return;
        stop();
        onError(error);
      }, WATCH_OPTIONS);
      // Also safe with synchronous adapters in tests: a failure may already have stopped this watch.
      if (token === generation.current) watch.current = id;
      else navigator.geolocation.clearWatch(id);
    } catch {
      if (token === generation.current) { stop(); onError({ code: 2, message: "定位服务暂不可用。" }); }
    }
  }, [stop]);
  useEffect(() => stop, [stop]);
  return { start, stop };
}
