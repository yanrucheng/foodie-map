/**
 * Unit tests for useFilters hook.
 * Tests toggle, toggleAll, and enableGroup functionality.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFilters } from "@/hooks/useFilters";
import type { Restaurant } from "@/types/restaurant";

/** Create a minimal mock restaurant with given cuisine_group. */
function mockRestaurant(cuisineGroup: string): Restaurant {
  return {
    id: 1,
    name: "Test Restaurant",
    name_zh: "测试餐厅",
    name_en: "Test Restaurant",
    cuisine: "Test Cuisine",
    cuisine_group: cuisineGroup,
    is_new: false,
    venue_type: "restaurant",
    area: "Test Area",
    primary_area: "Test Area",
    major_region: "Test Region",
    address: "Test Address",
    address_en: "Test Address",
    lat: 0,
    lon: 0,
    price_range: "$$",
    signature_dishes: "Test Dish",
    guide_url: "https://example.com",
    geo_source: "test",
    geocode_success: true,
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

    it("should have 'all' as default venueFilter", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));
      expect(result.current.venueFilter).toBe("all");
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

  describe("setVenueFilter", () => {
    it("should update venueFilter", () => {
      const { result } = renderHook(() => useFilters(mockRestaurants));

      act(() => {
        result.current.setVenueFilter("street_food");
      });

      expect(result.current.venueFilter).toBe("street_food");
    });
  });
});
