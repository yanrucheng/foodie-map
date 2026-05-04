import type { Restaurant } from "@/types/restaurant";
import type { HeatLayer, Map as LeafletMap } from "leaflet";

/** Manages the Leaflet heat layer overlay. */
export class HeatLayerManager {
  private layer: HeatLayer | null = null;
  private map: LeafletMap;

  constructor(map: LeafletMap) {
    this.map = map;
  }

  /** Shows the heat layer with the given restaurant data. */
  show(restaurants: Restaurant[]): void {
    this.remove();
    const points: [number, number, number][] = restaurants.map((r) => [
      r.lat,
      r.lon,
      r.is_new ? 1.0 : 0.65,
    ]);
    this.layer = L.heatLayer(points, {
      radius: 26,
      blur: 18,
      maxZoom: 16,
      gradient: {
        0.2: "#234f7d",
        0.45: "#2f8fd9",
        0.65: "#45c07c",
        0.82: "#f5c24d",
        1.0: "#e46955",
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
