import { useState, useCallback, useMemo } from "react";
import type { Restaurant, VenueType } from "@/types/restaurant";

/** Venue type filter mode: "all" shows everything, others isolate a specific type. */
export type VenueFilter = "all" | VenueType;

interface UseFiltersResult {
  /** Set of distinct cuisine_group keys present in the loaded restaurant data. */
  dataGroups: Set<string>;
  activeGroups: Set<string>;
  toggle: (group: string) => void;
  enableGroup: (group: string) => void;
  venueFilter: VenueFilter;
  setVenueFilter: (filter: VenueFilter) => void;
}

/**
 * Manages active cuisine group and venue type filter state.
 * Groups are derived from the distinct cuisine_group values in the loaded restaurant data.
 */
export function useFilters(restaurants: Restaurant[]): UseFiltersResult {
  const allGroups = useMemo(
    () => [...new Set(restaurants.map((r) => r.cuisine_group))],
    [restaurants]
  );

  const [activeGroups, setActiveGroups] = useState<Set<string>>(() => new Set(allGroups));
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all");

  // Sync activeGroups when allGroups changes (e.g., on data load)
  useMemo(() => {
    setActiveGroups((prev) => {
      // Keep existing active groups that still exist in new data
      const validGroups = allGroups.filter((g) => prev.has(g));
      // If no valid groups remain, activate all
      const newActive = validGroups.length > 0 ? validGroups : allGroups;
      const next = new Set(newActive);
      return prev.size === next.size && [...prev].every((g) => next.has(g)) ? prev : next;
    });
  }, [allGroups]);

  const toggle = useCallback((group: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
        // Prevent empty filter — keep at least one group active
        if (next.size === 0) next.add(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const enableGroup = useCallback((group: string) => {
    setActiveGroups((prev) => {
      if (prev.has(group)) return prev;
      const next = new Set(prev);
      next.add(group);
      return next;
    });
  }, []);

  return { dataGroups: new Set(allGroups), activeGroups, toggle, enableGroup, venueFilter, setVenueFilter };
}
