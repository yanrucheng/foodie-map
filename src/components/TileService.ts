import L from "@/lib/leaflet";
import type { Map as LeafletMap } from "leaflet";
import { getBasemap, type BasemapId } from "@/config/basemaps";

export type TileStatus = "loading" | "available" | "unavailable";

/** Reports failed batches, not individual missing tiles. Owns its layer and retry generation. */
export class TileService {
  private layer: L.TileLayer | null = null;
  private disposeLayer: (() => void) | null = null;
  private disposed = false;

  constructor(private map: LeafletMap, private report: (status: TileStatus) => void, private basemap?: BasemapId) {
    this.retry();
  }

  retry(): void {
    if (this.disposed) return;
    this.disposeLayer?.();
    this.report("loading");
    const { url, ...options } = getBasemap(this.basemap);
    const layer = L.tileLayer(url, options);
    this.layer = layer;
    let failed = 0;
    let succeeded = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const active = () => !this.disposed && this.layer === layer;
    const loading = () => { failed = 0; succeeded = 0; clearTimeout(timer); timer = undefined; };
    const error = () => {
      if (!active()) return;
      failed++;
      // Allow in-flight successes to arrive; one tile alone can never declare an outage.
      if (failed >= 3 && succeeded === 0 && timer === undefined) timer = setTimeout(() => {
        timer = undefined;
        if (active() && failed >= 3 && succeeded === 0) this.report("unavailable");
      }, 1500);
    };
    const success = () => {
      if (!active()) return;
      succeeded++;
      clearTimeout(timer); timer = undefined;
      this.report("available");
    };
    layer.on("loading", loading).on("tileerror", error).on("tileload", success);
    this.disposeLayer = () => {
      clearTimeout(timer);
      layer.off("loading", loading).off("tileerror", error).off("tileload", success);
      layer.remove();
    };
    layer.addTo(this.map);
  }

  remove(): void {
    this.disposed = true;
    this.disposeLayer?.();
    this.disposeLayer = null;
    this.layer = null;
  }
}
