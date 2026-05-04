import { useState, useCallback, useMemo } from "react";
import { cuisineGroups } from "@/config/cuisineGroups";

interface UseFiltersResult {
  activeGroups: Set<string>;
  toggle: (group: string) => void;
  enableGroup: (group: string) => void;
}

/** Manages active cuisine group filter state. At least one group stays active. */
export function useFilters(): UseFiltersResult {
  const allGroups = useMemo(() => Object.keys(cuisineGroups), []);
  const [activeGroups, setActiveGroups] = useState<Set<string>>(() => new Set(allGroups));

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

  return { activeGroups, toggle, enableGroup };
}
