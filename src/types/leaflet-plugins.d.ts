/** Type declarations for Leaflet plugins loaded via CDN (markercluster, heat). */
import "leaflet";

declare module "leaflet" {
  interface MarkerClusterGroupOptions {
    showCoverageOnHover?: boolean;
    spiderfyOnMaxZoom?: boolean;
    maxClusterRadius?: number;
    disableClusteringAtZoom?: number;
    iconCreateFunction?: (cluster: MarkerCluster) => DivIcon;
  }

  interface MarkerCluster {
    getChildCount(): number;
  }

  interface MarkerClusterGroup extends FeatureGroup {
    clearLayers(): this;
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;

  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends Layer {
    addTo(map: Map): this;
  }

  function heatLayer(
    latlngs: [number, number, number][],
    options?: HeatLayerOptions
  ): HeatLayer;
}
