import { useState, useCallback, useMemo } from "react";
import { getMapPosition, type SpatialContext } from "@/data/contract";
import type { Restaurant, VenueType } from "@/types/restaurant";

/** Venue type filter mode: "all" shows everything, others isolate a specific type. */
export type VenueFilter = "all" | VenueType;

interface UseFiltersResult {
  /** Set of distinct cuisine_group keys present in the loaded restaurant data. */
  dataGroups: Set<string>;
  visibleRestaurants: Restaurant[];
  mappableRestaurants: Restaurant[];
  reveal: (restaurant: Restaurant) => void;
  activeGroups: Set<string>;
  toggle: (group: string) => void;
  toggleAll: () => void;
  enableGroup: (group: string) => void;
  venueFilter: VenueFilter;
  setVenueFilter: (filter: VenueFilter) => void;
}

/**
 * Manages active cuisine group and venue type filter state.
 * Groups are derived from the distinct cuisine_group values in the loaded restaurant data.
 */
export function useFilters(restaurants: Restaurant[], datasetKey = "", spatialContext?: SpatialContext): UseFiltersResult {
  const allGroups = useMemo(
    () => [...new Set(restaurants.map((r) => r.cuisine_group))],
    [restaurants]
  );

  const [activeGroups, setActiveGroups] = useState<Set<string>>(() => new Set(allGroups));
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all");

  const [source, setSource] = useState({ restaurants, datasetKey });
  if (source.restaurants !== restaurants || source.datasetKey !== datasetKey) {
    setSource({ restaurants, datasetKey });
    setActiveGroups(new Set(allGroups));
    setVenueFilter("all");
  }

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

  /** Toggles between select-all and deselect-all (keeps at least one active). */
  const toggleAll = useCallback(() => {
    setActiveGroups((prev) => {
      const allSet = new Set(allGroups);
      // If all are already active, deselect all except the first
      if (prev.size === allSet.size && [...allSet].every((g) => prev.has(g))) {
        const first = allGroups[0];
        return first ? new Set<string>([first]) : new Set<string>();
      }
      return allSet;
    });
  }, [allGroups]);

  const enableGroup = useCallback((group: string) => {
    setActiveGroups((prev) => {
      if (prev.has(group)) return prev;
      const next = new Set(prev);
      next.add(group);
      return next;
    });
  }, []);

  const reveal = useCallback((restaurant: Restaurant) => {
    if (!restaurants.includes(restaurant)) return;
    enableGroup(restaurant.cuisine_group);
    setVenueFilter((previous) => previous === "all" || previous === restaurant.venue_type ? previous : "all");
  }, [restaurants, enableGroup]);
  const visibleRestaurants = useMemo(() => restaurants.filter((record) =>
    activeGroups.has(record.cuisine_group) && (venueFilter === "all" || record.venue_type === venueFilter)
  ), [restaurants, activeGroups, venueFilter]);
  const mappableRestaurants = useMemo(() => visibleRestaurants.filter((record) => getMapPosition(record, spatialContext) !== null), [visibleRestaurants, spatialContext]);

  return { visibleRestaurants, mappableRestaurants, reveal, dataGroups: new Set(allGroups), activeGroups, toggle, toggleAll, enableGroup, venueFilter, setVenueFilter };
}
