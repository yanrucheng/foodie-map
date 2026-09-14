// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { useSelection } from "@/hooks/useSelection";
import { useGuideData, type DatasetContext } from "@/hooks/useGuideData";
import { useFilters } from "@/hooks/useFilters";
import { MobilePopupCard } from "@/components/MobilePopupCard";
import { popupHtml } from "@/components/RestaurantMarker";
import { FilterPanel } from "@/components/FilterPanel";
import type { CityConfig } from "@/config/cities";
import { restaurant } from "./dataFixtures";
import fixture from "../e2e/fixtures/guide-experience.json";

const registry: CityConfig[] = fixture.cities.map((city) => ({ ...city, center: [city.center[0]!, city.center[1]!] }));
const path = registry[0]!.guides[0]!.dataPath;
const context: DatasetContext = { cityId: "fixture-city", guideId: "michelin-bib-gourmand", year: 2027, taxonomyPath: "/data/taxonomy/fixture-city.json" };
const response = (payload: unknown) => ({ ok: true, json: async () => payload });
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

describe("P04-R1 catalog-derived selection", () => {
  it("restores a valid edition, preserves valid dimensions, and cascades asymmetric coverage", () => {
    window.history.replaceState(null, "", "/?year=2026&city=fixture-city&guide=michelin-bib-gourmand#map");
    const { result } = renderHook(() => useSelection(registry));
    expect(result.current.datasetKey).toBe("fixture-city/2026/michelin-bib-gourmand");
    act(() => result.current.setYear(2027));
    expect(result.current.cityId).toBe("fixture-city");
    expect(result.current.guideId).toBe("michelin-bib-gourmand");
    act(() => result.current.setCity("new-city"));
    expect(result.current.guideOptions.map((option) => option.value)).toEqual(["michelin-starred"]);
    act(() => result.current.setYear(2026));
    expect(result.current.cityOptions.map((option) => option.value)).toEqual(["fixture-city", "old-only"]);
    expect(result.current.datasetKey).toBe("fixture-city/2026/michelin-bib-gourmand");
    expect(window.location.hash).toBe("#map");
    act(() => result.current.setCity("old-only"));
    expect(result.current.cityId).toBe("old-only");
    act(() => result.current.setCity("new-city")); // No guide in this year: deterministic fallback.
    expect(result.current.cityId).toBe("fixture-city");
  });

  it("normalizes invalid URL/setters, handles empty discovery, and restores history", () => {
    window.history.replaceState(null, "", "/?year=oops&city=missing&guide=missing");
    const { result, rerender } = renderHook(({ cities }) => useSelection(cities), { initialProps: { cities: registry } });
    expect(result.current.datasetKey).toBe("fixture-city/2027/michelin-bib-gourmand");
    expect(window.location.search).toContain("year=2027");
    act(() => { result.current.setYear(NaN); result.current.setGuide("missing"); });
    expect(result.current.guideId).toBe("michelin-bib-gourmand");
    act(() => {
      window.history.replaceState(null, "", "/?year=2026&city=old-only");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.cityId).toBe("old-only");
    rerender({ cities: [] });
    expect(result.current.city).toBeNull();
    expect(result.current.guide).toBeNull();
    expect(result.current.years).toEqual([]);
  });
});

describe("P04-R2/R6 dataset-bound loading", () => {
  it("returning A → B → A starts a new request instead of reviving A's previous context", async () => {
    const pending: ((value: unknown) => void)[] = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => pending.push(resolve))));
    const { result, rerender } = renderHook(({ file }) => useGuideData(file), { initialProps: { file: "/A" } });
    await act(async () => pending[0]!(response([restaurant()])));
    const firstKey = result.current.requestKey;
    rerender({ file: "/B" });
    rerender({ file: "/A" });
    expect(result.current.status).toBe("loading");
    expect(result.current.data).toEqual([]);
    expect(result.current.requestKey).not.toBe(firstKey);
    await act(async () => pending[2]!(response([restaurant({ name: "Fresh A" })])));
    await act(async () => pending[1]!(response([restaurant({ name: "Late B" })])));
    expect(result.current.data[0]?.name).toBe("Fresh A");
  });
  it("withdraws old data synchronously and ignores C,A,B completion even when abort is ignored", async () => {
    const pending = new Map<string, (value: unknown) => void>();
    vi.stubGlobal("fetch", vi.fn((url: string) => new Promise((resolve) => pending.set(url, resolve))));
    const { result, rerender } = renderHook(({ file }) => useGuideData(file), { initialProps: { file: "/old" } });
    await act(async () => pending.get("/old")!(response([restaurant({ name: "Old" })])));
    expect(result.current.data[0]?.name).toBe("Old");
    rerender({ file: "/A" });
    expect(result.current.status).toBe("loading");
    expect(result.current.data).toEqual([]);
    rerender({ file: "/B" });
    rerender({ file: "/C" });
    await act(async () => pending.get("/C")!(response([restaurant({ name: "C" })])));
    expect(result.current.data[0]?.name).toBe("C");
    await act(async () => pending.get("/A")!(response([restaurant({ name: "A" })])));
    await act(async () => pending.get("/B")!(response([restaurant({ name: "B" })])));
    expect(result.current.data[0]?.name).toBe("C");
  });

  it.each([
    ["404", () => ({ ok: false, status: 404 })],
    ["network", () => Promise.reject(new TypeError("Network unavailable"))],
    ["bad JSON", () => ({ ok: true, json: async () => { throw new SyntaxError("bad JSON"); } })],
    ["object", () => response({})],
    ["string", () => response("invalid")],
    ["wrong field type", () => response([restaurant({ price: {} as string })])],
    ["unsafe link", () => response([restaurant({ guide_url: "javascript:alert(1)" })])],
  ])("recovers %s by retry, then distinguishes an empty edition", async (_name, fail) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(fail).mockResolvedValueOnce(response([restaurant()])).mockResolvedValueOnce(response([])));
    const { result, rerender } = renderHook(({ file }) => useGuideData(file), { initialProps: { file: "/A" } });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.data).toEqual([]);
    act(() => result.current.retry());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender({ file: "/empty" });
    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(result.current.error).toBeNull();
  });

  it("commits taxonomy and restaurants together and rejects wrong identity or unknown groups", async () => {
    let resolveTaxonomy!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn((url: string) => url === context.taxonomyPath
      ? new Promise((resolve) => { resolveTaxonomy = resolve; })
      : Promise.resolve(response(fixture.datasets[path as keyof typeof fixture.datasets]))));
    const { result, rerender } = renderHook(({ value }) => useGuideData(path, value), { initialProps: { value: context } });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.status).toBe("loading");
    await act(async () => resolveTaxonomy(response(fixture.taxonomies[context.taxonomyPath as keyof typeof fixture.taxonomies])));
    expect(result.current.status).toBe("ready");
    expect(result.current.groups.find((group) => group.key === "NEW_GROUP")?.labelZh).toBe("测试城新菜系");
    rerender({ value: { ...context, year: 2026 } });
    await act(async () => resolveTaxonomy(response(fixture.taxonomies[context.taxonomyPath as keyof typeof fixture.taxonomies])));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/版次/);
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(response(url === context.taxonomyPath
      ? fixture.taxonomies[context.taxonomyPath as keyof typeof fixture.taxonomies]
      : [restaurant({ edition_year: 2027, cuisine_group: "UNREGISTERED" })]))));
    rerender({ value: context });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/未知菜系/);
  });
});

describe("P04-R3/R4 shared filters and city taxonomy", () => {
  it("search reveal clears both blocking filters; a new dataset resets venue and cuisine", () => {
    const records = [restaurant({ cuisine_group: "CANTONESE", venue_type: "restaurant", lat: 22.3, lon: 114.1 }),
      restaurant({ id: 2, cuisine_group: "NEW_GROUP", venue_type: "dessert" })];
    const { result, rerender } = renderHook(({ key }) => useFilters(records, key), { initialProps: { key: "A" } });
    act(() => { result.current.toggle("NEW_GROUP"); result.current.setVenueFilter("restaurant"); });
    expect(result.current.visibleRestaurants).toEqual([records[0]]);
    act(() => result.current.reveal(records[1]!));
    expect(result.current.venueFilter).toBe("all");
    expect(result.current.visibleRestaurants).toEqual(records);
    expect(result.current.mappableRestaurants).toEqual([records[0]]);
    act(() => { result.current.toggle("CANTONESE"); result.current.setVenueFilter("dessert"); });
    rerender({ key: "B" });
    expect(result.current.venueFilter).toBe("all");
    expect(result.current.visibleRestaurants).toEqual(records);
  });

  it("renders and filters a new group in city sort order", () => {
    const groups = fixture.taxonomies["/data/taxonomy/fixture-city.json"].groups;
    const toggle = vi.fn();
    const view = render(<FilterPanel groups={groups} dataGroups={new Set(["NEW_GROUP", "CANTONESE"])}
      activeGroups={new Set(["NEW_GROUP", "CANTONESE"])} onToggle={toggle} onToggleAll={() => {}}
      venueFilter="all" onVenueFilterChange={() => {}} onModeToggle={() => {}} currentMode="marker" />);
    expect(view.getAllByRole("checkbox").map((element) => element.parentElement?.textContent)).toEqual(["测试城新菜系", "测试城粤菜"]);
    fireEvent.click(view.getAllByRole("checkbox")[0]!);
    expect(toggle).toHaveBeenCalledWith("NEW_GROUP");
  });
});

describe("P04-R5/R6 shared facts and safe rendering", () => {
  it.each(["HKD", "CNY", "MOP"] as const)("preserves %s original price, 2027 new status and safe sources in both layouts", (currency) => {
    const record = restaurant({ edition_year: 2027, is_new: true, price: " 約 200–400 ", currency,
      guide_url: "https://guide.michelin.com/en/fixture/restaurant/example" });
    const view = render(<MobilePopupCard restaurant={record} onClose={() => {}} />);
    const popup = document.createElement("div"); popup.innerHTML = popupHtml(record);
    for (const text of ["2027 新晋", "2027 米其林必比登", currency + "  約 200–400 ", "暂无可靠坐标，无法地图定位"]) {
      expect(view.baseElement.textContent).toContain(text); expect(popup.textContent).toContain(text);
    }
    expect(view.getByRole("link").getAttribute("href")).toBe(popup.querySelector("a")?.getAttribute("href"));
  });

  it("treats markup as text and disables unsafe source links even for direct card input", () => {
    const record = restaurant({ name: '<img src=x onerror="alert(1)">', address: "<script>alert(1)</script>", guide_url: "javascript:alert(1)" });
    const view = render(<MobilePopupCard restaurant={record} onClose={() => {}} />);
    const popup = document.createElement("div"); popup.innerHTML = popupHtml(record);
    expect(view.baseElement.querySelector("img,script,a")).toBeNull();
    expect(popup.querySelector("img,script,a")).toBeNull();
    expect(view.baseElement.textContent).toContain(record.name);
    expect(popup.textContent).toContain(record.name);
    expect(popup.textContent).not.toMatch(/undefined|null/);
  });
});
