// @vitest-environment jsdom
/**
 * Unit tests for URL state utilities.
 * Tests readSelectionParams and writeSelectionParams functions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readSelectionParams, writeSelectionParams } from "@/utils/urlState";

describe("urlState", () => {
  const originalUrl = window.location.href;
  const originalState = window.history.state;

  beforeEach(() => {
    window.history.replaceState(null, "", "/map?year=2024&city=hong-kong&guide=michelin-guide");
  });

  afterEach(() => {
    window.history.replaceState(originalState, "", originalUrl);
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
      window.history.replaceState(null, "", "/map");
      const params = readSelectionParams();
      expect(params).toEqual({
        year: undefined,
        city: undefined,
        guide: undefined,
      });
    });

    it("should handle partial params", () => {
      window.history.replaceState(null, "", "/map?city=beijing");
      const params = readSelectionParams();
      expect(params).toEqual({
        year: undefined,
        city: "beijing",
        guide: undefined,
      });
    });
  });

  describe("writeSelectionParams", () => {
    it("should update all selection params in the current URL", () => {
      writeSelectionParams(2025, "beijing", "michelin-starred");

      expect(window.location.pathname + window.location.search).toBe(
        "/map?year=2025&city=beijing&guide=michelin-starred",
      );
    });

    it("should preserve existing pathname", () => {
      window.history.replaceState(null, "", "/custom-path?view=map");
      writeSelectionParams(2024, "shanghai", "bib-gourmand");

      expect(window.location.pathname).toBe("/custom-path");
      expect(window.location.search).toBe(
        "?view=map&year=2024&city=shanghai&guide=bib-gourmand",
      );
    });
  });
});
