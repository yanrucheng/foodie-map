import type { LocationPermission } from "../types/geolocation";

/**
 * Queries the current geolocation permission state via the Permissions API.
 * Returns "unavailable" if the API is not present.
 */
export async function queryGeolocationPermission(): Promise<LocationPermission> {
  if (!navigator.permissions) return "unavailable";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state as LocationPermission;
  } catch {
    return "unavailable";
  }
}

/**
 * Returns true if the Geolocation API is available in the current environment.
 */
export function isGeolocationSupported(): boolean {
  return "geolocation" in navigator;
}

/**
 * Returns true if the DeviceOrientation API is available.
 * Note: availability does not guarantee hardware compass exists.
 */
export function isOrientationSupported(): boolean {
  return "DeviceOrientationEvent" in window;
}

/**
 * Requests DeviceOrientation permission on iOS 13+.
 * On non-iOS or older browsers this is a no-op that resolves to "granted".
 * Must be called inside a user-gesture handler (click/tap).
 */
export async function requestOrientationPermission(): Promise<LocationPermission> {
  const event = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };

  if (typeof event.requestPermission !== "function") {
    // Non-iOS browsers — permission not gated
    return "granted";
  }

  try {
    const result = await event.requestPermission();
    return result as LocationPermission;
  } catch {
    return "denied";
  }
}
