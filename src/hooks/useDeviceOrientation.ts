import { useState, useEffect, useCallback, useRef } from "react";
import type { OrientationState } from "../types/geolocation";
import {
  isOrientationSupported,
  requestOrientationPermission,
} from "../utils/permissions";

/** Throttle interval for orientation updates (ms). */
const THROTTLE_MS = 100;

/**
 * Reactive hook wrapping the DeviceOrientation API.
 * Exposes compass heading (degrees from north) with throttled updates.
 * Handles both Android (`deviceorientationabsolute`) and iOS (`webkitCompassHeading`).
 * Gracefully degrades to a no-op on desktop/unsupported browsers.
 */
export function useDeviceOrientation() {
  const [state, setState] = useState<OrientationState>({
    heading: null,
    isSupported: isOrientationSupported(),
  });

  const activeRef = useRef(false);
  const lastUpdateRef = useRef(0);

  /** Handles incoming orientation events with throttling. */
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < THROTTLE_MS) return;
    lastUpdateRef.current = now;

    // iOS provides webkitCompassHeading (degrees from north, 0–360)
    const iosHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
      .webkitCompassHeading;

    // Android/Chrome provides event.alpha on `deviceorientationabsolute`
    // alpha = rotation around z-axis; heading = 360 - alpha
    let heading: number | null = null;

    if (typeof iosHeading === "number" && iosHeading >= 0) {
      heading = iosHeading;
    } else if (event.absolute && typeof event.alpha === "number") {
      heading = (360 - event.alpha) % 360;
    } else if (typeof event.alpha === "number") {
      // Fallback: non-absolute alpha (less accurate but usable)
      heading = (360 - event.alpha) % 360;
    }

    if (heading !== null) {
      setState({ heading: Math.round(heading), isSupported: true });
    }
  }, []);

  /** Removes all orientation listeners. */
  const cleanup = useCallback(() => {
    window.removeEventListener(
      "deviceorientationabsolute" as keyof WindowEventMap,
      handleOrientation as EventListener,
    );
    window.removeEventListener("deviceorientation", handleOrientation);
  }, [handleOrientation]);

  /**
   * Starts listening for device orientation.
   * On iOS 13+, must be called from a user gesture handler (click/tap).
   * Returns the permission result.
   */
  const start = useCallback(async (): Promise<"granted" | "denied" | "unavailable"> => {
    if (!isOrientationSupported()) {
      setState({ heading: null, isSupported: false });
      return "unavailable";
    }

    // Request iOS permission (no-op on non-iOS)
    const permission = await requestOrientationPermission();
    if (permission === "denied") {
      return "denied";
    }

    activeRef.current = true;

    // Prefer `deviceorientationabsolute` (Android: gives true north heading)
    const hasAbsolute = "ondeviceorientationabsolute" in window;
    if (hasAbsolute) {
      window.addEventListener(
        "deviceorientationabsolute" as keyof WindowEventMap,
        handleOrientation as EventListener,
        { passive: true },
      );
    } else {
      window.addEventListener("deviceorientation", handleOrientation, {
        passive: true,
      });
    }

    return "granted";
  }, [handleOrientation]);

  /** Stops orientation tracking and resets heading. */
  const stop = useCallback(() => {
    activeRef.current = false;
    cleanup();
    setState((prev) => ({ ...prev, heading: null }));
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { ...state, start, stop };
}
