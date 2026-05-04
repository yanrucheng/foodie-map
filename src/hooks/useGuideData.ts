import { useState, useEffect, useRef } from "react";
import type { Restaurant } from "@/types/restaurant";

interface UseGuideDataResult {
  data: Restaurant[];
  loading: boolean;
  error: string | null;
}

/**
 * Normalizes raw JSON records into valid Restaurant objects.
 * Filters out records with missing geocode data (lat/lon) and
 * fills default values for optional fields.
 */
function normalizeRecords(raw: Record<string, unknown>[]): Restaurant[] {
  return raw
    .filter((r) => typeof r.lat === "number" && typeof r.lon === "number")
    .map((r) => ({
      ...r,
      venue_type: r.venue_type ?? "restaurant",
      is_new: r.is_new ?? false,
      name: r.name ?? `${r.name_zh ?? ""} / ${r.name_en ?? ""}`.trim(),
      name_zh: r.name_zh ?? (r.name as string)?.split(" / ")[0] ?? "",
      name_en: r.name_en ?? (r.name as string)?.split(" / ")[1] ?? "",
      primary_area: r.primary_area ?? r.area ?? "",
      major_region: r.major_region ?? r.city ?? "",
      geo_source: r.geo_source ?? r.geocode_source ?? "",
      address: r.address ?? r.address_en ?? "",
      avg_price_hkd: r.avg_price_hkd ?? r.avg_price_cny ?? r.price_range ?? "",
      signature_dishes: r.signature_dishes ?? "",
      geocode_query: r.geocode_query ?? "",
      geocode_display_name: r.geocode_display_name ?? "",
      fallback_reason: r.fallback_reason ?? "",
    })) as unknown as Restaurant[];
}

/**
 * Fetches restaurant data from a static JSON path (relative to public/).
 * Aborts in-flight requests when dataPath changes, preventing race conditions
 * during rapid segment switching. Normalizes raw data to handle schema variations.
 */
export function useGuideData(dataPath: string): UseGuideDataResult {
  const [data, setData] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort any in-flight request from a previous dataPath change
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const base = import.meta.env.BASE_URL;
        const url = `${base}${dataPath.replace(/^\//, "")}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!controller.signal.aborted) setData(normalizeRecords(json));
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchData();
    return () => { controller.abort(); };
  }, [dataPath]);

  return { data, loading, error };
}
