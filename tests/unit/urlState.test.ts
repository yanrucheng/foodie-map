/**
 * Unit tests for URL state utilities.
 * Tests readSelectionParams and writeSelectionParams functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readSelectionParams, writeSelectionParams } from "@/utils/urlState";

describe("urlState", () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    // Mock window.location
    const mockLocation = {
      search: "?year=2024&city=hong-kong&guide=michelin-guide",
      pathname: "/map",
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });

    // Mock window.history.replaceState
    window.history.replaceState = vi.fn();
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
    window.history.replaceState = originalHistory.replaceState;
  });

  describe("readSelectionParams", () => {
    it("should read all selection params from URL", () => {
      const params = readSelectionParams();
      expect(params).toEqual({
        year: "2024",
        city: "hong-kong",
        guide: "michelin-guide",
      });
    });

    it("should return undefined for missing params", () => {
      (window.location as any).search = "";
      const params = readSelectionParams();
      expect(params).toEqual({
        year: undefined,
        city: undefined,
        guide: undefined,
      });
    });

    it("should handle partial params", () => {
      (window.location as any).search = "?city=beijing";
      const params = readSelectionParams();
      expect(params).toEqual({
        year: undefined,
        city: "beijing",
        guide: undefined,
      });
    });
  });

  describe("writeSelectionParams", () => {
    it("should write all params to URL and call replaceState", () => {
      writeSelectionParams(2025, "beijing", "michelin-starred");

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/map?year=2025&city=beijing&guide=michelin-starred"
      );
    });

    it("should preserve existing pathname", () => {
      (window.location as any).pathname = "/custom-path";
      writeSelectionParams(2024, "shanghai", "bib-gourmand");

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        expect.stringContaining("/custom-path?")
      );
    });
  });
});
