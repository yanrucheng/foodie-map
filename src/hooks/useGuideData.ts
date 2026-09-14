import { useState, useEffect, useCallback } from "react";
import { parseRestaurantArray, type Restaurant, type SpatialContext } from "@/data/contract";
import { taxonomySchema, taxonomyBundleSchema, type Taxonomy } from "@/data/taxonomy";
import { validateDataset } from "@/data/validation";
import { guideTypeSchema } from "@/data/contract";
import { readReleaseJson, ReleaseUnavailableError } from "@/data/release";

export interface DatasetContext {
  cityId: string;
  guideId: string;
  year: number;
  taxonomyPath: string;
  mappingsPath?: string;
  spatialContext?: SpatialContext;
}
type Result = {
  requestKey: string;
  status: "loading" | "ready" | "empty" | "error" | "unavailable";
  data: Restaurant[];
  groups: Taxonomy["groups"];
  error: string | null;
  delivery: "network" | "cache" | null;
  offline: boolean;
};
const NO_DATA: Restaurant[] = [];
const NO_GROUPS: Taxonomy["groups"] = [];

/** Data and taxonomy commit together, and only for the currently requested identity. */
export function useGuideData(dataPath: string | null, context?: DatasetContext) {
  const [attempt, setAttempt] = useState(0);
  const cityId = context?.cityId;
  const guideId = context?.guideId;
  const year = context?.year;
  const taxonomyPath = context?.taxonomyPath;
  const mappingsPath = context?.mappingsPath;
  const spatialKey = JSON.stringify(context?.spatialContext);
  const inputKey = JSON.stringify([cityId, year, guideId, dataPath, taxonomyPath, mappingsPath, spatialKey]);
  const [scope, setScope] = useState({ inputKey, generation: 0 });
  if (scope.inputKey !== inputKey) setScope({ inputKey, generation: scope.generation + 1 });
  const requestKey = JSON.stringify([inputKey, scope.generation, attempt]);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!dataPath) return;
    const controller = new AbortController();
    async function load() {
      try {
        const [dataResponse, taxonomyResponse, mappingsResponse] = await Promise.all([readReleaseJson(dataPath!, controller.signal), taxonomyPath ? readReleaseJson(taxonomyPath, controller.signal) : null, mappingsPath ? readReleaseJson(mappingsPath, controller.signal) : null]);
        const payload = dataResponse.payload, taxonomyPayload = taxonomyResponse?.payload;
        const data = parseRestaurantArray(payload);
        const taxonomy = taxonomyPayload == null ? null : taxonomySchema.parse(taxonomyPayload);
        if (taxonomy && taxonomy.city !== cityId) throw new Error("分类与所选城市不一致");
        if (mappingsResponse && taxonomy && cityId && guideId && year) {
          const bundle = taxonomyBundleSchema.parse({ taxonomy, mappings: mappingsResponse.payload });
          const checked = validateDataset(data, { city: cityId, guide_type: guideTypeSchema.parse(guideId), edition_year: year, spatial: spatialKey ? JSON.parse(spatialKey) : undefined, ...bundle }, dataPath!);
          if (checked.diagnostics.some((issue) => issue.severity === "error")) throw new Error("数据与所选分类、映射或空间上下文不一致");
        }
        const keys = taxonomy ? new Set(taxonomy.groups.map((group) => group.key)) : null;
        for (const record of data) {
          if (cityId && (record.city !== cityId || record.guide_type !== guideId || record.edition_year !== year)) {
            throw new Error("餐厅记录与所选版次不一致");
          }
          if (keys && !keys.has(record.cuisine_group)) throw new Error(`未知菜系分组：${record.cuisine_group}`);
        }
        if (!controller.signal.aborted) setResult({ requestKey, status: data.length ? "ready" : "empty", data, groups: taxonomy?.groups ?? NO_GROUPS, error: null, delivery: dataResponse.delivery === "cache" || taxonomyResponse?.delivery === "cache" || mappingsResponse?.delivery === "cache" ? "cache" : "network", offline: dataResponse.offline || !!taxonomyResponse?.offline || !!mappingsResponse?.offline });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ requestKey, status: "error", data: NO_DATA, groups: NO_GROUPS, error: error instanceof Error ? error.message : "数据不可用", delivery: null, offline: error instanceof ReleaseUnavailableError && error.offline });
      }
    }
    void load();
    return () => controller.abort();
  }, [dataPath, taxonomyPath, mappingsPath, spatialKey, cityId, guideId, year, requestKey]);

  // Never expose the previous result, even before effect cleanup for a new selection.
  const current: Result = result?.requestKey === requestKey ? result : {
    requestKey, status: dataPath ? "loading" : "unavailable", data: NO_DATA, groups: NO_GROUPS, error: null, delivery: null, offline: false,
  };
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    // The first controller caches the already-selected identity, without prefetching other datasets.
    navigator.serviceWorker?.addEventListener("controllerchange", retry);
    return () => navigator.serviceWorker?.removeEventListener("controllerchange", retry);
  }, [retry]);
  return { ...current, loading: current.status === "loading", retry };
}
