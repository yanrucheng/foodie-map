import catalog from "../../public/data/catalog.json" with { type: "json" };
import { catalogCities } from "../data/catalog.ts";
import type { SpatialContext } from "../data/contract.ts";
import type { BasemapId } from "./basemaps.ts";

/** Configuration for a supported city in the app. */
export interface CityConfig {
  id: string;
  label: string;
  labelZh: string;
  center: [number, number];
  /** Optional spatial metadata supplied by the discovery adapter. Omitted means WGS84. */
  spatialContext?: SpatialContext;
  basemap?: BasemapId;
  taxonomyPath?: string;
  mappingsPath?: string;
  scope?: { description: string; members: string[] };
  zoom: number;
  guides: GuideConfig[];
}

/** A single guide (data source) within a city. */
export interface GuideConfig {
  id: string;
  label: string;
  labelZh: string;
  year: number;
  dataPath: string;
  coverage?: import("../data/catalog.ts").CatalogGuide["coverage"];
  provenance?: import("../data/catalog.ts").CatalogGuide["provenance"];
}

/** Adapter only. All discovery facts belong to public/data/catalog.json. */
export const cities: CityConfig[] = catalogCities(catalog);
