// @vitest-environment jsdom
/**
 * Unit tests for useFilters hook.
 * Tests toggle, toggleAll, and enableGroup functionality.
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
    serving_form: "meal",
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

    it("should have 'all' as default formFilter", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));
      expect(result.current.formFilter).toBe("all");
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

    it("should prevent empty filter — keep at least one group active", () => {
      const singleRestaurant = [mockRestaurant("CANTONESE")];
      const { result } = renderHook(() => useFilters(singleRestaurant));

      act(() => {
        result.current.toggle("CANTONESE");
      });

      // Should still have CANTONESE active (prevented from becoming empty)
      expect(result.current.activeGroups.has("CANTONESE")).toBe(true);
    });
  });

  describe("toggleAll", () => {
    it("should deselect all except first when all groups are active", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      act(() => {
        result.current.toggleAll();
      });

      expect(result.current.activeGroups.size).toBe(1);
      expect(result.current.activeGroups.has("CANTONESE")).toBe(true);
    });

    it("should select all groups when not all are active", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      // First, deactivate one group
      act(() => {
        result.current.toggle("DIM_SUM");
      });
      expect(result.current.activeGroups.size).toBe(2);

      // Then toggleAll should activate all
      act(() => {
        result.current.toggleAll();
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

  describe("setFormFilter", () => {
    it("should update formFilter", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      act(() => {
        result.current.setFormFilter("snack");
      });

      expect(result.current.formFilter).toBe("snack");
    });
  });
});

describe("P08 form intersections and missing annotations", () => {
  it("counts whole-dataset forms, filters map eligibility after intersection, reveals unknown and resets", () => {
    const rows = [
      { id: 1, cuisine_group: "A", serving_form: "meal", lat: 22.3, lon: 114.1 },
      { id: 2, cuisine_group: "A", serving_form: "snack" },
      { id: 3, cuisine_group: "B", serving_form: "meal" },
      { id: 4, cuisine_group: "B", serving_form: null },
      { id: 5, cuisine_group: "A", venue_type: "restaurant" },
    ].map((row) => ({ name: "test", city: "fixture-city", guide_type: "michelin-bib-gourmand", edition_year: 2026, ...row } as Restaurant));
    const { result, rerender } = renderHook(({ key }) => useFilters(rows, key), { initialProps: { key: "A" } });
    expect(result.current.formCounts).toEqual({ meal: 2, snack: 1, dessert: 0, drink: 0, unclassified: 2 });
    act(() => { result.current.setFormFilter("meal"); result.current.toggle("B"); });
    expect(result.current.visibleRestaurants.map((r) => r.id)).toEqual([1]);
    expect(result.current.mappableRestaurants.map((r) => r.id)).toEqual([1]);
    expect(result.current.formCounts.meal).toBe(2);
    act(() => result.current.setFormFilter("unclassified"));
    expect(result.current.visibleRestaurants.map((r) => r.id)).toEqual([5]);
    expect(result.current.mappableRestaurants).toEqual([]);
    act(() => result.current.reveal(rows[3]!));
    expect(result.current.formFilter).toBe("unclassified");
    expect(result.current.visibleRestaurants.map((r) => r.id)).toEqual([4, 5]);
    act(() => result.current.reveal(rows[1]!));
    expect(result.current.formFilter).toBe("all");
    act(() => result.current.setFormFilter("drink"));
    rerender({ key: "B" });
    expect(result.current.formFilter).toBe("all");
    expect(result.current.visibleRestaurants).toEqual(rows);
  });
});
