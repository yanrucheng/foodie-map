import { getMapPosition, type SpatialContext } from "@/data/contract";
import { wgs84ToGcj02 } from "./gcj02";
import { getBasemap, type BasemapId } from "@/config/basemaps";

/** Provider display degrees before Leaflet's Mercator projection; never an input record. */
export type MapPosition = [lat: number, lon: number] & { readonly coordinateSystem: "MAP_DISPLAY" };

/** The only raw WGS84 -> tile-coordinate boundary. Eligibility belongs to P02. */
export function projectMapPosition(
  record: Parameters<typeof getMapPosition>[0],
  spatialContext?: SpatialContext,
  basemap?: BasemapId,
): MapPosition | null {
  const position = getMapPosition(record, spatialContext);
  if (!position) return null;
  // GSI uses JGD2011 geographic coordinates: no GCJ offset. WGS84/JGD2011
  // equivalence is a map-scale approximation; its accuracy evidence is separate.
  return (getBasemap(basemap).coordinates === "GCJ02" ? wgs84ToGcj02(...position) : position) as MapPosition;
}
