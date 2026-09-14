import type { BasemapId } from "@/config/basemaps";
import type { Restaurant } from "@/types/restaurant";
import L from "@/lib/leaflet";
import type { HeatLayer, Map as LeafletMap } from "leaflet";
import { projectMapPosition } from "@/utils/mapPosition";
import { type SpatialContext } from "@/data/contract";

/** Manages the Leaflet heat layer overlay. */
export class HeatLayerManager {
  private layer: HeatLayer | null = null;
  private map: LeafletMap;

  constructor(map: LeafletMap) {
    this.map = map;
  }

  /** Uses the same usable positions as markers, flight and counts. */
  show(restaurants: Restaurant[], spatialContext?: SpatialContext, basemap?: BasemapId): void {
    this.remove();
    const points: [number, number, number][] = [];
    for (const record of restaurants) {
      const position = projectMapPosition(record, spatialContext, basemap);
      if (!position) continue;
      const [lat, lng] = position;
      points.push([lat, lng, record.is_new ? 1.0 : 0.8]);
    }
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
      // leaflet.heat 0.2.0 does not cancel its pending redraw in onRemove.
      // This resource belongs to the overlay, not to the global library adapter.
      const pending = this.layer as HeatLayer & { _frame?: number | null };
      if (pending._frame != null) L.Util.cancelAnimFrame(pending._frame);
      pending._frame = null;
      this.map.removeLayer(this.layer);
      this.layer = null;
    }
  }
}
