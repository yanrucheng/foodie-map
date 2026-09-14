import { useState, useMemo, useCallback, useEffect } from "react";
import { cities, type CityConfig } from "@/config/cities";
import { readSelectionParams, writeSelectionParams } from "@/utils/urlState";

export interface SegmentOption { value: string; label: string }
interface Selection { year: number; cityId: string; guideId: string }

/** Latest year, then catalog order. Preserve each requested dimension if valid. */
export function resolveSelection(registry: CityConfig[], requested: Partial<Selection>) {
  const years = [...new Set(registry.flatMap((city) => city.guides.map((guide) => guide.year)))].sort((a, b) => b - a);
  const year = requested.year != null && years.includes(requested.year) ? requested.year : years[0];
  const validCities = registry.filter((city) => city.guides.some((guide) => guide.year === year));
  const city = validCities.find((city) => city.id === requested.cityId) ?? validCities[0] ?? null;
  const guides = city?.guides.filter((guide) => guide.year === year) ?? [];
  const guide = guides.find((guide) => guide.id === requested.guideId) ?? guides[0] ?? null;
  return { year: year ?? null, city, guide, years, validCities, guides };
}

/** The discovery adapter owns registry facts; this hook owns only selection and URL state. */
export function useSelection(registry: CityConfig[] = cities) {
  const [requested, setRequested] = useState<Partial<Selection>>(() => {
    const params = readSelectionParams();
    return { year: params.year ? Number(params.year) : undefined, cityId: params.city, guideId: params.guide };
  });
  const resolved = useMemo(() => resolveSelection(registry, requested), [registry, requested]);
  const { year, city, guide } = resolved;
  useEffect(() => {
    if (year != null && city && guide) writeSelectionParams(year, city.id, guide.id);
  }, [year, city, guide]);
  useEffect(() => {
    const restore = () => {
      const params = readSelectionParams();
      setRequested({ year: Number(params.year), cityId: params.city, guideId: params.guide });
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const change = useCallback((next: Partial<Selection>) => {
    setRequested((previous) => {
      const current = resolveSelection(registry, previous);
      return { year: current.year ?? undefined, cityId: current.city?.id, guideId: current.guide?.id, ...next };
    });
  }, [registry]);
  return {
    year, city, guide, cityId: city?.id ?? "", guideId: guide?.id ?? "",
    datasetKey: city && guide ? `${city.id}/${guide.year}/${guide.id}` : null,
    years: resolved.years.map((value) => ({ value: String(value), label: String(value) })),
    cityOptions: resolved.validCities.map((item) => ({ value: item.id, label: item.labelZh })),
    guideOptions: resolved.guides.map((item) => ({ value: item.id, label: item.labelZh })),
    setYear: (value: number) => change({ year: value }),
    setCity: (value: string) => change({ cityId: value }),
    setGuide: (value: string) => change({ guideId: value }),
  };
}

export type UseSelectionResult = ReturnType<typeof useSelection>;
