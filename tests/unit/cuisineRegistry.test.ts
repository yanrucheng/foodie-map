/**
 * Unit tests for cuisine registry utilities.
 * Tests getGroupStyle and getGroupLabel functions.
 */

import { describe, it, expect } from "vitest";
import { getGroupStyle, getGroupLabel, FALLBACK_GROUP } from "@/config/cuisineRegistry";

describe("cuisineRegistry", () => {
  describe("getGroupStyle", () => {
    it("should return correct style for CANTONESE group", () => {
      const style = getGroupStyle("CANTONESE");
      expect(style.color).toBe("#D64C4C");
      expect(style.textColor).toBe("#fff");
    });

    it("should return correct style for DIM_SUM group", () => {
      const style = getGroupStyle("DIM_SUM");
      expect(style.color).toBe("#43A36B");
      expect(style.textColor).toBe("#fff");
    });

    it("should return fallback style for unknown group key", () => {
      const style = getGroupStyle("UNKNOWN_CUISINE");
      expect(style.color).toBe("#BDBDBD");
      expect(style.textColor).toBe("#1a1a1a");
    });

    it("should return fallback style for empty string", () => {
      const style = getGroupStyle("");
      expect(style.color).toBe("#BDBDBD");
    });
  });

  describe("getGroupLabel", () => {
    it("should return Chinese label for CANTONESE", () => {
      const label = getGroupLabel("CANTONESE");
      expect(label).toBe("粵菜 · 港式");
    });

    it("should return Chinese label for DIM_SUM", () => {
      const label = getGroupLabel("DIM_SUM");
      expect(label).toBe("點心 · 茶樓");
    });

    it("should return the key itself for unknown group", () => {
      const label = getGroupLabel("NONEXISTENT_GROUP");
      expect(label).toBe("NONEXISTENT_GROUP");
    });

    it("should return empty string for empty key", () => {
      const label = getGroupLabel("");
      expect(label).toBe("");
    });
  });

  describe("FALLBACK_GROUP constant", () => {
    it("should be OTHER", () => {
      expect(FALLBACK_GROUP).toBe("OTHER");
    });
  });
});
