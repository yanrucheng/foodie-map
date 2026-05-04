import { useState, useEffect } from "react";
import type { Restaurant } from "@/types/restaurant";

interface UseGuideDataResult {
  data: Restaurant[];
  loading: boolean;
  error: string | null;
}

/** Fetches restaurant data from a static JSON path (relative to public/). */
export function useGuideData(dataPath: string): UseGuideDataResult {
  const [data, setData] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const base = import.meta.env.BASE_URL;
        const url = `${base}${dataPath.replace(/^\//, "")}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: Restaurant[] = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [dataPath]);

  return { data, loading, error };
}
