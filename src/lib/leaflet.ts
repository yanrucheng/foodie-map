// One import boundary for Leaflet's mutable plugin registry. leaflet.heat uses
// the window.L set by Leaflet's UMD entry; markercluster requires the same core.
// P01 owns this package adapter; P05 owns map/layer lifecycle behavior.
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export default L;
