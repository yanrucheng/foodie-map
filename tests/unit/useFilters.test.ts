// @vitest-environment jsdom
/**
 * Unit tests for useFilters hook.
 * Tests cuisine actions, category/star intersections and search reveal.
 */

import { afterEach, describe, it, expect } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useFilters } from "@/hooks/useFilters";
import type { Restaurant } from "@/types/restaurant";

afterEach(cleanup);

/** Create a minimal mock restaurant with given cuisine_group. */
function mockRestaurant(cuisineGroup: string): Restaurant {
  return {
    id: 1,
    name: "Test Restaurant",
    name_zh: "测试餐厅",
    name_en: "Test Restaurant",
    city: "test-city",
    guide_type: "michelin-bib-gourmand",
    edition_year: 2026,
    cuisine: "Test Cuisine",
    cuisine_group: cuisineGroup,
    is_new: false,
    dining_category: "meat",
    area: "Test Area",
    primary_area: "Test Area",
    major_region: "Test Region",
    address: "Test Address",
    address_en: "Test Address",
    lat: null,
    lon: null,
    price_range: "$$",
    signature_dishes: "Test Dish",
    guide_url: null,
    geo_source: "test",
    geocode_success: false,
    status: "active",
  };
}

describe("useFilters", () => {
  const mockRestaurants: Restaurant[] = [
    mockRestaurant("CANTONESE"),
    mockRestaurant("DIM_SUM"),
    mockRestaurant("NOODLES_CONGEE"),
  ];

  describe("initial state", () => {
    it("should have all groups active by default", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));
      expect(result.current.activeGroups.size).toBe(3);
      expect(result.current.activeGroups.has("CANTONESE")).toBe(true);
      expect(result.current.activeGroups.has("DIM_SUM")).toBe(true);
      expect(result.current.activeGroups.has("NOODLES_CONGEE")).toBe(true);
    });

    it("should have correct dataGroups derived from restaurants", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));
      expect(result.current.dataGroups.size).toBe(3);
    });

    it("should have 'all' as default diningFilter", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));
      expect(result.current.diningFilter).toBe("all");
    });
  });

  describe("toggle", () => {
    it("should deactivate a group when toggling an active group", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      act(() => {
        result.current.toggle("CANTONESE");
      });

      expect(result.current.activeGroups.has("CANTONESE")).toBe(false);
      expect(result.current.activeGroups.size).toBe(2);
    });

    it("should activate a group when toggling an inactive group", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      act(() => {
        result.current.toggle("CANTONESE"); // deactivate
      });

      act(() => {
        result.current.toggle("CANTONESE"); // activate
      });

      expect(result.current.activeGroups.has("CANTONESE")).toBe(true);
      expect(result.current.activeGroups.size).toBe(3);
    });

    it("allows the last cuisine to be unchecked, producing zero results", () => {
      const singleRestaurant = [mockRestaurant("CANTONESE")];
      const { result } = renderHook(() => useFilters(singleRestaurant));

      act(() => {
        result.current.toggle("CANTONESE");
      });

      expect(result.current.activeGroups.size).toBe(0);
      expect(result.current.visibleRestaurants).toEqual([]);
      expect(result.current.mappableRestaurants).toEqual([]);
    });
  });

  describe("bulk actions", () => {
    it("deselects every cuisine when all groups are active", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      act(() => {
        result.current.deselectAll();
      });

      expect(result.current.activeGroups.size).toBe(0);
      expect(result.current.visibleRestaurants).toEqual([]);
    });

    it("should select all groups when not all are active", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      // First, deactivate one group
      act(() => {
        result.current.toggle("DIM_SUM");
      });
      expect(result.current.activeGroups.size).toBe(2);

      // Select all restores the complete cuisine group.
      act(() => {
        result.current.selectAll();
      });

      expect(result.current.activeGroups.size).toBe(3);
    });
  });

  describe("enableGroup", () => {
    it("should add a group if not already active", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      // Deactivate one group first
      act(() => {
        result.current.toggle("DIM_SUM");
      });
      expect(result.current.activeGroups.has("DIM_SUM")).toBe(false);

      // Enable it again
      act(() => {
        result.current.enableGroup("DIM_SUM");
      });

      expect(result.current.activeGroups.has("DIM_SUM")).toBe(true);
    });

    it("should do nothing if group is already active", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      const sizeBefore = result.current.activeGroups.size;

      act(() => {
        result.current.enableGroup("CANTONESE");
      });

      expect(result.current.activeGroups.size).toBe(sizeBefore);
    });
  });

  describe("setDiningFilter", () => {
    it("should update diningFilter", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      act(() => {
        result.current.setDiningFilter("staple");
      });

      expect(result.current.diningFilter).toBe("staple");
    });
  });
});

describe("P09 dining intersections and missing annotations", () => {
  it("counts whole-dataset forms, filters map eligibility after intersection, reveals unknown and resets", () => {
    const rows = [
      { id: 1, cuisine_group: "A", dining_category: "meat", lat: 22.3, lon: 114.1 },
      { id: 2, cuisine_group: "A", dining_category: "staple" },
      { id: 3, cuisine_group: "B", dining_category: "meat" },
      { id: 4, cuisine_group: "B", dining_category: null },
      { id: 5, cuisine_group: "A", venue_type: "restaurant" },
    ].map((row) => ({ name: "test", city: "fixture-city", guide_type: "michelin-bib-gourmand", edition_year: 2026, ...row } as Restaurant));
    const { result, rerender } = renderHook(({ key }) => useFilters(rows, key), { initialProps: { key: "A" } });
    expect(result.current.diningCounts).toEqual({ staple: 1, meat: 2, seafood: 0, dessert_drink: 0, french: 0, chinese: 0, japanese_course: 0, other: 0, unclassified: 2 });
    act(() => { result.current.setDiningFilter("meat"); result.current.toggle("B"); });
    expect(result.current.visibleRestaurants.map((r) => r.id)).toEqual([1]);
    expect(result.current.mappableRestaurants.map((r) => r.id)).toEqual([1]);
    expect(result.current.diningCounts.meat).toBe(2);
    act(() => result.current.setDiningFilter("other"));
    expect(result.current.visibleRestaurants.map((r) => r.id)).toEqual([5]);
    expect(result.current.mappableRestaurants).toEqual([]);
    act(() => result.current.reveal(rows[3]!));
    expect(result.current.diningFilter).toBe("other");
    expect(result.current.visibleRestaurants.map((r) => r.id)).toEqual([4, 5]);
    act(() => result.current.reveal(rows[1]!));
    expect(result.current.diningFilter).toBe("all");
    act(() => result.current.setDiningFilter("dessert_drink"));
    rerender({ key: "B" });
    expect(result.current.diningFilter).toBe("all");
    expect(result.current.visibleRestaurants).toEqual(rows);
  });
});


describe("star and cuisine filter contract", () => {
  const rows = [
    { id: 1, cuisine_group: "A", dining_category: "french", star_rating: 2, lat: 22.3, lon: 114.1, geocode_success: true },
    { id: 2, cuisine_group: "B", dining_category: "french", star_rating: 2 },
    { id: 3, cuisine_group: "A", dining_category: "meat", star_rating: 1 },
    { id: 4, cuisine_group: "A", dining_category: "french", star_rating: 3 },
    { id: 5, cuisine_group: "B", dining_category: null, star_rating: null },
    { id: 6, cuisine_group: "B", dining_category: "french" },
  ].map((row) => ({ ...mockRestaurant(row.cuisine_group), guide_type: "michelin-starred", ...row } as Restaurant));

  it("matches exact stars including unknown only in all, and intersects all three groups", () => {
    const { result } = renderHook(() => useFilters(rows));
    expect(result.current.visibleRestaurants).toEqual(rows);
    for (const star of [1, 2, 3] as const) {
      act(() => result.current.setStarFilter(star));
      expect(result.current.visibleRestaurants).toEqual(rows.filter((r) => r.star_rating === star));
    }
    act(() => { result.current.setStarFilter(2); result.current.setDiningFilter("french"); result.current.toggle("B"); });
    expect(result.current.visibleRestaurants).toEqual([rows[0]]);
    expect(result.current.mappableRestaurants).toEqual([rows[0]]);
    act(() => result.current.deselectAll());
    expect(result.current.visibleRestaurants).toEqual([]);
    act(() => result.current.toggle("B"));
    expect(result.current.visibleRestaurants).toEqual([rows[1]]);
    expect(result.current.mappableRestaurants).toEqual([]);
    act(() => result.current.selectAll());
    expect(result.current.visibleRestaurants).toEqual(rows.slice(0, 2));
    expect(result.current.starFilter).toBe(2);
    expect(result.current.diningFilter).toBe("french");
    expect(result.current.dataGroups).toEqual(new Set(["A", "B"]));
    expect(result.current.diningCounts.french).toBe(4);
  });

  it("search opens only necessary groups, preserves compatible constraints and ignores stale records", () => {
    const { result } = renderHook(() => useFilters(rows));
    act(() => { result.current.setStarFilter(2); result.current.setDiningFilter("french"); result.current.deselectAll(); });
    act(() => result.current.reveal(rows[1]!));
    expect(result.current.activeGroups).toEqual(new Set(["B"]));
    expect(result.current.starFilter).toBe(2);
    expect(result.current.diningFilter).toBe("french");
    act(() => result.current.reveal(rows[2]!));
    expect(result.current.starFilter).toBe("all");
    expect(result.current.diningFilter).toBe("all");
    act(() => { result.current.setStarFilter(3); result.current.reveal(rows[4]!); });
    expect(result.current.starFilter).toBe("all");
    act(() => { result.current.deselectAll(); result.current.setStarFilter(1); result.current.reveal({ ...rows[0]! }); });
    expect(result.current.activeGroups.size).toBe(0);
    expect(result.current.starFilter).toBe(1);
  });

  it("preserves filters across layout renders and resets on edition changes or newly loaded data", () => {
    const { result, rerender } = renderHook(({ data, key }) => useFilters(data, key), { initialProps: { data: rows, key: "city/2026/starred" } });
    act(() => { result.current.setStarFilter(2); result.current.setDiningFilter("french"); result.current.deselectAll(); });
    rerender({ data: rows, key: "city/2026/starred" });
    expect(result.current.visibleRestaurants).toEqual([]);
    expect(result.current.starFilter).toBe(2);
    rerender({ data: rows, key: "city/2027/starred" });
    expect(result.current.starFilter).toBe("all");
    expect(result.current.diningFilter).toBe("all");
    expect(result.current.visibleRestaurants).toEqual(rows);
    rerender({ data: [], key: "city/2027/bib" });
    expect(result.current.dataGroups.size).toBe(0);
    rerender({ data: rows, key: "city/2027/bib" });
    expect(result.current.visibleRestaurants).toEqual(rows);
  });
});
