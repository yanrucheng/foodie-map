import { useCallback, useEffect, useRef } from "react";
import { isOrientationSupported, requestOrientationPermission } from "@/utils/permissions";

/** An absolute compass only; relative alpha is not a north-referenced heading. */
export function absoluteHeading(event: DeviceOrientationEvent): number | null {
  const ios = event as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
  if (typeof ios.webkitCompassHeading === "number" && Number.isFinite(ios.webkitCompassHeading) && ios.webkitCompassHeading >= 0 &&
    (ios.webkitCompassAccuracy === undefined || (Number.isFinite(ios.webkitCompassAccuracy) && ios.webkitCompassAccuracy >= 0))) {
    return ios.webkitCompassHeading % 360;
  }
  return event.absolute && typeof event.alpha === "number" && Number.isFinite(event.alpha)
    ? (360 - event.alpha % 360) % 360 : null;
}

/** Permission continuations and event callbacks belong to the start that created them. */
export function useDeviceOrientation() {
  const generation = useRef(0);
  const cleanup = useRef<(() => void) | null>(null);
  const granted = useRef(false);
  const stop = useCallback(() => {
    generation.current++;
    cleanup.current?.();
    cleanup.current = null;
  }, []);
  const start = useCallback(async (onHeading: (heading: number | null) => void, userGesture: boolean) => {
    stop();
    const token = generation.current;
    if (!isOrientationSupported()) return;
    // Resuming in the foreground never asks for permission. A late initial grant is discarded.
    if (!granted.current) {
      if (!userGesture) return;
      const permission = await requestOrientationPermission();
      if (token !== generation.current || permission !== "granted") return;
      granted.current = true;
    }
    if (token !== generation.current) return;
    const type = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    const listener = (event: Event) => {
      if (token === generation.current) onHeading(absoluteHeading(event as DeviceOrientationEvent));
    };
    window.addEventListener(type, listener, { passive: true });
    cleanup.current = () => window.removeEventListener(type, listener);
  }, [stop]);
  useEffect(() => stop, [stop]);
  return { start, stop };
}
