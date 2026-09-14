import { z } from "zod";

/** P05 owns provider behavior; catalog selects a provider, never arbitrary code/URLs. */
export const basemapSchema = z.enum(["amap", "gsi-standard"]);
export type BasemapId = z.infer<typeof basemapSchema>;

export const basemaps = {
  amap: {
    url: "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    minZoom: 2, maxZoom: 18, subdomains: ["1", "2", "3", "4"],
    attribution: "&copy; 高德地图",
    coordinates: "GCJ02" as const,
  },
  "gsi-standard": {
    url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
    // z9–18 Japan standard map. Lower zooms have different sources/attribution.
    minZoom: 9, maxZoom: 18, subdomains: [] as string[],
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル（国土地理院）</a>',
    coordinates: "JGD2011" as const,
  },
};

export function getBasemap(id: BasemapId = "amap") { return basemaps[id]; }
