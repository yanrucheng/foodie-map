import { useState, useMemo, useCallback } from "react";
import { cities, type CityConfig, type GuideConfig } from "@/config/cities";
import {
  readSelectionParams,
  writeSelectionParams,
} from "@/utils/urlState";

/** A single option in a segment picker. */
export interface SegmentOption {
  value: string;
  label: string;
}

/** Return type for the useSelection hook. */
export interface UseSelectionResult {
  year: number;
  cityId: string;
  guideId: string;
  /** Available year options for the year picker. */
  years: SegmentOption[];
  /** Available city options filtered by current year. */
  cityOptions: SegmentOption[];
  /** Available guide options filtered by current year + city. */
  guideOptions: SegmentOption[];
  /** Resolved city config for the active selection. */
  city: CityConfig;
  /** Resolved guide config for the active selection. */
  guide: GuideConfig;
  /** Set the active year. Cascades: resets city and guide if no longer valid. */
  setYear: (year: number) => void;
  /** Set the active city. Cascades: resets guide if no longer valid. */
  setCity: (cityId: string) => void;
  /** Set the active guide. No cascade. */
  setGuide: (guideId: string) => void;
}

// ---------------------------------------------------------------------------
// Pure derivation helpers (no hooks — safe to call from useState initializer)
// ---------------------------------------------------------------------------

/** Derives all unique years from the registry, sorted descending. */
function getAllYears(): number[] {
  const years = new Set<number>();
  for (const city of cities) {
    for (const guide of city.guides) {
      years.add(guide.year);
    }
  }
  return [...years].sort((a, b) => b - a);
}

/** Returns cities that have at least one guide matching the given year. */
function getCitiesForYear(year: number): CityConfig[] {
  return cities.filter((c) => c.guides.some((g) => g.year === year));
}

/** Returns guides within a city that match the given year. */
function getGuidesForCity(city: CityConfig, year: number): GuideConfig[] {
  return city.guides.filter((g) => g.year === year);
}

/** Resolves initial selection from URL params, falling back to first valid option. */
function resolveInitialState(): {
  year: number;
  cityId: string;
  guideId: string;
} {
  const params = readSelectionParams();
  const allYears = getAllYears();

  // Resolve year — parse from URL or fall back to first available
  const urlYear = params.year ? Number(params.year) : NaN;
  const year = allYears.includes(urlYear) ? urlYear : allYears[0]!;

  // Resolve city — match URL param or fall back to first for this year
  const validCities = getCitiesForYear(year);
  const city =
    validCities.find((c) => c.id === params.city) ?? validCities[0]!;

  // Resolve guide — match URL param or fall back to first for this year+city
  const validGuides = getGuidesForCity(city, year);
  const guide =
    validGuides.find((g) => g.id === params.guide) ?? validGuides[0]!;

  return { year, cityId: city.id, guideId: guide.id };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Manages the active (year, city, guide) selection with cascade logic and URL sync. */
export function useSelection(): UseSelectionResult {
  const [state, setState] = useState(() => {
    const initial = resolveInitialState();
    // Write resolved state to URL on mount so the URL always reflects selection
    writeSelectionParams(initial.year, initial.cityId, initial.guideId);
    return initial;
  });

  // --- Derived option lists ---

  const allYears = useMemo(() => getAllYears(), []);

  const validCities = useMemo(
    () => getCitiesForYear(state.year),
    [state.year]
  );

  const city = useMemo(
    () => validCities.find((c) => c.id === state.cityId) ?? validCities[0]!,
    [validCities, state.cityId]
  );

  const validGuides = useMemo(
    () => getGuidesForCity(city, state.year),
    [city, state.year]
  );

  const guide = useMemo(
    () => validGuides.find((g) => g.id === state.guideId) ?? validGuides[0]!,
    [validGuides, state.guideId]
  );

  // --- Segment options for pickers ---

  const years: SegmentOption[] = useMemo(
    () => allYears.map((y) => ({ value: String(y), label: String(y) })),
    [allYears]
  );

  const cityOptions: SegmentOption[] = useMemo(
    () => validCities.map((c) => ({ value: c.id, label: c.labelZh })),
    [validCities]
  );

  const guideOptions: SegmentOption[] = useMemo(
    () => validGuides.map((g) => ({ value: g.id, label: g.labelZh })),
    [validGuides]
  );

  // --- Cascade setters ---

  /** Sets year; preserves city/guide when still valid, otherwise resets to first. */
  const setYear = useCallback((year: number) => {
    setState((prev) => {
      const newCities = getCitiesForYear(year);
      const newCity =
        newCities.find((c) => c.id === prev.cityId) ?? newCities[0]!;
      const newGuides = getGuidesForCity(newCity, year);
      const newGuide =
        newGuides.find((g) => g.id === prev.guideId) ?? newGuides[0]!;
      const next = { year, cityId: newCity.id, guideId: newGuide.id };
      writeSelectionParams(next.year, next.cityId, next.guideId);
      return next;
    });
  }, []);

  /** Sets city; preserves guide when still valid, otherwise resets to first. */
  const setCity = useCallback((cityId: string) => {
    setState((prev) => {
      const targetCity = cities.find((c) => c.id === cityId);
      if (!targetCity) return prev;
      const newGuides = getGuidesForCity(targetCity, prev.year);
      const newGuide =
        newGuides.find((g) => g.id === prev.guideId) ?? newGuides[0]!;
      const next = { ...prev, cityId, guideId: newGuide.id };
      writeSelectionParams(next.year, next.cityId, next.guideId);
      return next;
    });
  }, []);

  /** Sets guide directly — no cascade needed. */
  const setGuide = useCallback((guideId: string) => {
    setState((prev) => {
      const next = { ...prev, guideId };
      writeSelectionParams(next.year, next.cityId, next.guideId);
      return next;
    });
  }, []);

  return {
    year: state.year,
    cityId: state.cityId,
    guideId: state.guideId,
    years,
    cityOptions,
    guideOptions,
    city,
    guide,
    setYear,
    setCity,
    setGuide,
  };
}
