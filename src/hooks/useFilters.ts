import { useState, useCallback, useMemo } from "react";
import { getMapPosition, type SpatialContext } from "@/data/contract";
import { diningKey, countDiningCategories, type DiningCounts, type DiningFilter } from "@/config/restaurantPresentation";
import type { Restaurant } from "@/types/restaurant";

export type { DiningFilter } from "@/config/restaurantPresentation";
export type StarFilter = "all" | 1 | 2 | 3;

interface UseFiltersResult {
  /** Set of distinct cuisine_group keys present in the loaded restaurant data. */
  dataGroups: Set<string>;
  diningCounts: DiningCounts;
  visibleRestaurants: Restaurant[];
  mappableRestaurants: Restaurant[];
  reveal: (restaurant: Restaurant) => void;
  activeGroups: Set<string>;
  toggle: (group: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  enableGroup: (group: string) => void;
  diningFilter: DiningFilter;
  setDiningFilter: (filter: DiningFilter) => void;
  starFilter: StarFilter;
  setStarFilter: (filter: StarFilter) => void;
}

/**
 * Manages active cuisine group and dining category filter state.
 * Groups are derived from the distinct cuisine_group values in the loaded restaurant data.
 */
export function useFilters(restaurants: Restaurant[], datasetKey = "", spatialContext?: SpatialContext): UseFiltersResult {
  const allGroups = useMemo(
    () => [...new Set(restaurants.map((r) => r.cuisine_group))],
    [restaurants]
  );

  const [activeGroups, setActiveGroups] = useState<Set<string>>(() => new Set(allGroups));
  const [diningFilter, setDiningFilter] = useState<DiningFilter>("all");
  const [starFilter, setStarFilter] = useState<StarFilter>("all");

  const [source, setSource] = useState({ restaurants, datasetKey });
  if (source.restaurants !== restaurants || source.datasetKey !== datasetKey) {
    setSource({ restaurants, datasetKey });
    setActiveGroups(new Set(allGroups));
    setDiningFilter("all");
    setStarFilter("all");
  }

  const toggle = useCallback((group: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setActiveGroups(new Set(allGroups)), [allGroups]);
  const deselectAll = useCallback(() => setActiveGroups(new Set()), []);

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
    setDiningFilter((previous) => previous === "all" || previous === diningKey(restaurant) ? previous : "all");
    setStarFilter((previous) => previous === "all" || previous === restaurant.star_rating ? previous : "all");
  }, [restaurants, enableGroup]);
  const visibleRestaurants = useMemo(() => restaurants.filter((record) =>
    activeGroups.has(record.cuisine_group) && (diningFilter === "all" || diningKey(record) === diningFilter)
      && (starFilter === "all" || record.star_rating === starFilter)
  ), [restaurants, activeGroups, diningFilter, starFilter]);
  const mappableRestaurants = useMemo(() => visibleRestaurants.filter((record) => getMapPosition(record, spatialContext) !== null), [visibleRestaurants, spatialContext]);

  const diningCounts = useMemo(() => countDiningCategories(restaurants), [restaurants]);

  return { diningCounts, visibleRestaurants, mappableRestaurants, reveal, dataGroups: new Set(allGroups), activeGroups, toggle, selectAll, deselectAll, enableGroup, diningFilter, setDiningFilter, starFilter, setStarFilter };
}
