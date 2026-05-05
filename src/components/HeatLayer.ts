import type { Restaurant } from "@/types/restaurant";
import type { HeatLayer, Map as LeafletMap } from "leaflet";

/** Manages the Leaflet heat layer overlay. */
export class HeatLayerManager {
  private layer: HeatLayer | null = null;
  private map: LeafletMap;

  constructor(map: LeafletMap) {
    this.map = map;
  }

  /** Shows the heat layer with the given restaurant data (skips null coordinates). */
  show(restaurants: Restaurant[]): void {
    this.remove();
    const points: [number, number, number][] = restaurants
      .filter((r) => r.lat != null && r.lon != null)
      .map((r) => [r.lat, r.lon, r.is_new ? 1.0 : 0.8]);
    this.layer = L.heatLayer(points, {
      radius: 38,
      blur: 14,
      maxZoom: 13,
      minOpacity: 0.25,
      gradient: {
        0.05: "#4a90d9",
        0.25: "#67b7dc",
        0.45: "#6dd47e",
        0.65: "#f5c24d",
        0.82: "#f5874a",
        1.0: "#e84d4d",
      },
    });
    this.layer.addTo(this.map);
  }

  /** Removes the heat layer from the map. */
  remove(): void {
    if (this.layer) {
      this.map.removeLayer(this.layer);
      this.layer = null;
    }
  }
}
