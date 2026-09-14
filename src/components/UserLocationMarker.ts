import type { BasemapId } from "@/config/basemaps";
import type { Map as LeafletMap, Marker, Circle } from "leaflet";
import L from "@/lib/leaflet";
import { projectMapPosition } from "@/utils/mapPosition";
import type { SpatialContext } from "@/data/contract";

/** Position data consumed by the location marker. */
export interface UserLocationData {
  lat: number;
  lon: number;
  accuracy: number;
  heading: number | null;
}

/**
 * Manages the user's live location visualization on the Leaflet map.
 * Renders a pulsing blue dot, an accuracy circle, and a directional cone.
 * Uses L.DivIcon for GPU-accelerated CSS rotation of the heading cone.
 */
export class UserLocationMarker {
  private map: LeafletMap;
  private marker: Marker | null = null;
  private accuracyCircle: Circle | null = null;
  private accuracyRenderer: L.SVG | null = null;
  private lastHeading: number | null = null;

  constructor(map: LeafletMap) {
    this.map = map;
  }

  /** Builds the DivIcon HTML with the pulsing dot and optional heading cone. */
  private buildIconHtml(heading: number | null): string {
    const coneHtml =
      heading !== null
        ? `<div class="user-loc-cone" style="transform: rotate(${heading}deg)"></div>`
        : "";

    return `
      <div class="user-loc-wrapper">
        ${coneHtml}
        <div class="user-loc-pulse"></div>
        <div class="user-loc-dot"></div>
      </div>
    `;
  }

  /** Updates the marker position and heading on the map. Creates if not present. */
  update(data: UserLocationData, spatialContext?: SpatialContext, basemap?: BasemapId): void {
    const { lat, lon, accuracy, heading } = data;
    const position = projectMapPosition({ lat, lon }, spatialContext, basemap);
    if (!position || !Number.isFinite(accuracy) || accuracy < 0) { this.remove(); return; }
    const [gcjLat, gcjLon] = position;
    const latlng = L.latLng(gcjLat, gcjLon);

    if (!this.marker) {
      // Create marker with DivIcon
      this.marker = L.marker(latlng, {
        icon: L.divIcon({
          className: "user-loc-icon",
          html: this.buildIconHtml(heading),
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        }),
        interactive: false,
        zIndexOffset: 9999,
      });
      this.marker.addTo(this.map);

      // Create accuracy circle
      // An owned SVG renderer has no queued Canvas redraw after rapid map disposal.
      this.accuracyRenderer = L.svg();
      this.accuracyCircle = L.circle(latlng, {
        renderer: this.accuracyRenderer,
        radius: accuracy,
        className: "user-loc-accuracy",
        interactive: false,
      });
      this.accuracyCircle.addTo(this.map);
    } else {
      // Update position
      this.marker.setLatLng(latlng);
      this.accuracyCircle?.setLatLng(latlng);
      this.accuracyCircle?.setRadius(accuracy);

      // Update icon only if heading changed (avoid unnecessary DOM churn)
      if (heading !== this.lastHeading) {
        this.marker.setIcon(
          L.divIcon({
            className: "user-loc-icon",
            html: this.buildIconHtml(heading),
            iconSize: [48, 48],
            iconAnchor: [24, 24],
          }),
        );
      }
    }

    this.lastHeading = heading;
  }

  /** Removes all layers from the map. */
  remove(): void {
    if (this.marker) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
    if (this.accuracyCircle) {
      this.map.removeLayer(this.accuracyCircle);
      this.accuracyCircle = null;
    }
    this.accuracyRenderer?.remove();
    this.accuracyRenderer = null;
    this.lastHeading = null;
  }

  /** Returns true if the marker is currently shown on the map. */
  isActive(): boolean {
    return this.marker !== null;
  }
}
