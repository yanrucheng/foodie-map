import { useState, useEffect, useRef } from "react";
import type { Restaurant } from "@/types/restaurant";

interface UseGuideDataResult {
  data: Restaurant[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches restaurant data from a static JSON path (relative to public/).
 * Aborts in-flight requests when dataPath changes, preventing race conditions
 * during rapid segment switching.
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
        const json: Restaurant[] = await res.json();
        if (!controller.signal.aborted) setData(json);
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
