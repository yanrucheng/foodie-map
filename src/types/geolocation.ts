/** Reactive state emitted by the geolocation hook. */
export interface GeolocationState {
  lat: number | null;
  lon: number | null;
  /** Accuracy radius in meters. */
  accuracy: number | null;
  /** Whether the hook is actively tracking position. */
  isActive: boolean;
  /** Last geolocation error, if any. */
  error: GeolocationPositionError | null;
}

/** Reactive state emitted by the device orientation hook. */
export interface OrientationState {
  /** Compass heading in degrees from north (0–360). Null if unsupported or denied. */
  heading: number | null;
  /** Whether the device has orientation hardware. */
  isSupported: boolean;
}

/** Permission status for location-related APIs. */
export type LocationPermission = "prompt" | "granted" | "denied" | "unavailable";
