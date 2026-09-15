// @vitest-environment jsdom
import { createRef, useState } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import L from "@/lib/leaflet";
import { MapShell, type MapShellHandle, type MapShellProps } from "@/components/MapShell";
import { HeatLayerManager } from "@/components/HeatLayer";
import { UserLocationMarker } from "@/components/UserLocationMarker";
import { createRestaurantMarker } from "@/components/RestaurantMarker";
import { TileService } from "@/components/TileService";
import { projectMapPosition } from "@/utils/mapPosition";
import { getMapPosition, type SpatialContext } from "@/data/contract";
import { restaurant } from "./dataFixtures";
import { cities } from "@/config/cities";
import { catalogCities } from "@/data/catalog";
import catalog from "../../public/data/catalog.json";
import { getBasemap, basemapSchema } from "@/config/basemaps";
import type { BasemapId } from "@/config/basemaps";

let createdMaps: L.Map[];
let removedMaps: Set<L.Map>;
beforeEach(() => {
  vi.useFakeTimers(); createdMaps = []; removedMaps = new Set();
  const remove = L.Map.prototype.remove;
  vi.spyOn(L.Map.prototype, "remove").mockImplementation(function (this: L.Map) { removedMaps.add(this); return remove.call(this); });
  const original = L.map;
  vi.spyOn(L, "map").mockImplementation((...args) => { const map = original(args[0], { ...args[1], preferCanvas: false }); createdMaps.push(map); return map; });
  vi.spyOn(L.Map.prototype, "flyTo").mockImplementation(function (this: L.Map) { return this; });
  vi.spyOn(L.MarkerClusterGroup.prototype, "zoomToShowLayer").mockImplementation((_marker, callback) => { callback?.(); });
  // jsdom has no canvas. Capture actual inputs to the plugin; browser suite covers real rendering.
  vi.spyOn(L, "heatLayer").mockImplementation(() => L.layerGroup() as unknown as L.HeatLayer);
});
afterEach(() => { cleanup(); createdMaps.forEach((map) => { if (!removedMaps.has(map)) map.remove(); map.getContainer().remove(); }); vi.useRealTimers(); vi.restoreAllMocks(); });

function props(records: MapShellProps["restaurants"], spatialContext?: SpatialContext): MapShellProps {
  return { selection: null, onRestaurantSelect() {}, onRestaurantClose() {}, restaurants: records, visibleRestaurants: records, spatialContext, groups: [], dataGroups: new Set(["OTHER"]), activeGroups: new Set(["OTHER"]),
    onToggleAll() {}, onToggleGroup() {}, formCounts: { meal: 0, snack: 0, dessert: 0, drink: 0, unclassified: 0 }, formFilter: "all", onFormFilterChange() {}, center: [22.3, 114.17], zoom: 12 };
}

describe("P05-R1/R2/R3 shared coordinate interpretation", () => {
  it("matches a published numerical pair (third-party algorithm reference, not ground calibration)", () => {
    // https://github.com/wandergis/coordtransform README, retrieved in P05 evidence.
    expect(projectMapPosition({ lat: 39.915, lon: 116.404 })).toEqual([39.91640428150164, 116.41024449916938]);
  });

  it.each([
    [35.65861, 139.74556, 35.658610000894015],
    [35.7101, 139.8107, 35.710100000894556],
    [35.69056, 139.69944, 35.690560000894344],
  ])("GSI numeric boundary fits independent inverse EPSG:9936 at %s,%s", (lat, lon, referenceLat) => {
    // Independent zero-translation WGS84->GRS80 reference, EPSG:9936 accuracy 1m.
    // Definition and independent calculations are persisted in P05 basemap evidence.
    const actual = projectMapPosition({ lat, lon }, { coordinateSystem: "WGS84" }, "gsi-standard")!;
    const differenceMeters = Math.abs(actual[0] - referenceLat) * Math.PI / 180 * 6371000;
    expect(actual[1]).toBe(lon);
    expect(differenceMeters + 1).toBeLessThanOrEqual(10);
  });

  it.each([[39.915, 116.404], [22.3, 114.17], [22.166, 113.559], [35.65861, 139.74556], [35.7101, 139.8107], [35.69056, 139.69944]])("center, marker, heat, flight, user dot and circle agree at %s,%s", (lat, lon) => {
    const record = restaurant({ lat, lon }); const expected = projectMapPosition(record)!;
    const ref = createRef<MapShellHandle>();
    const view = render(<MapShell ref={ref} {...props([record])} center={[lat, lon]} />);
    const map = createdMaps[0]!;
    expect(map.getCenter()).toEqual(L.latLng(expected));
    const marker = createRestaurantMarker(record)!;
    expect(marker.getLatLng()).toEqual(L.latLng(expected));
    act(() => ref.current!.toggleMode());
    expect(L.heatLayer).toHaveBeenLastCalledWith([[...expected, 0.8]], expect.any(Object));
    act(() => ref.current!.flyToRestaurant(record));
    expect(map.flyTo).toHaveBeenLastCalledWith(expected, 15, { duration: 0.8 });
    const user = new UserLocationMarker(map); user.update({ lat, lon, accuracy: 12, heading: null });
    const userLayers: L.Layer[] = []; map.eachLayer((layer) => { if (layer instanceof L.Circle || layer instanceof L.Marker && layer.options.interactive === false) userLayers.push(layer); });
    expect(userLayers).toHaveLength(2);
    userLayers.forEach((layer) => expect((layer as L.Marker).getLatLng()).toEqual(L.latLng(expected)));
    user.remove(); view.unmount();
  });

  it("formal catalog adapter retains spatialContext; explicit unknown cannot become default WGS84", () => {
    const tokyo = cities.find((city) => city.id === "tokyo")!;
    expect(tokyo.spatialContext).toEqual({ coordinateSystem: "WGS84" });
    expect(tokyo.basemap).toBe("gsi-standard");
    expect(projectMapPosition({ lat: 35.65861, lon: 139.74556 }, tokyo.spatialContext)).toEqual([35.65861, 139.74556]);
    const unknownCatalog = { ...catalog, cities: catalog.cities.map((city) => city.id === "tokyo"
      ? { ...city, spatialContext: { coordinateSystem: "unknown" } } : city) };
    const unknown = catalogCities(unknownCatalog).find((city) => city.id === "tokyo")!;
    const record = restaurant({ lat: 35.65861, lon: 139.74556 });
    expect(getMapPosition(record, unknown.spatialContext)).toBeNull();
    expect(projectMapPosition(record, unknown.spatialContext)).toBeNull();
    expect(createRestaurantMarker(record, { spatialContext: unknown.spatialContext })).toBeNull();
    expect(unknown.guides[0]!.dataPath).toMatch(/^\/data\/tokyo\/2026\//);
  });

  it("provider switching changes every display consumer without changing P02 eligibility", () => {
    const record = restaurant({ lat: 22.3, lon: 114.17 });
    const ref = createRef<MapShellHandle>();
    const factory = vi.spyOn(L, "tileLayer");
    const view = render(<MapShell ref={ref} {...props([record])} />);
    expect(createdMaps[0]!.getCenter()).toEqual(L.latLng(projectMapPosition(record)!));
    view.rerender(<MapShell ref={ref} {...props([record])} basemap="gsi-standard" />);
    const expected: [number, number] = [22.3, 114.17]; // routing probe, not a GSI coverage claim
    const map = createdMaps.slice(-1)[0]!;
    expect(map.getCenter()).toEqual(L.latLng(expected));
    expect(factory).toHaveBeenLastCalledWith(getBasemap("gsi-standard").url, expect.objectContaining({ minZoom: 9, maxZoom: 18 }));
    expect(createRestaurantMarker(record, { basemap: "gsi-standard" })!.getLatLng()).toEqual(L.latLng(expected));
    act(() => ref.current!.toggleMode());
    expect(L.heatLayer).toHaveBeenLastCalledWith([[...expected, 0.8]], expect.any(Object));
    act(() => ref.current!.flyToRestaurant(record));
    expect(map.flyTo).toHaveBeenLastCalledWith(expected, 15, { duration: 0.8 });
    const user = new UserLocationMarker(map);
    user.update({ lat: 22.3, lon: 114.17, accuracy: 10, heading: null }, undefined, "gsi-standard");
    const circles: L.Circle[] = []; map.eachLayer((layer) => { if (layer instanceof L.Circle) circles.push(layer); });
    expect(circles[0]!.getLatLng()).toEqual(L.latLng(expected)); user.remove();
    expect(getMapPosition(record)).toEqual(expected);
    view.rerender(<MapShell ref={ref} {...props([record])} basemap="amap" />);
    expect(createdMaps.slice(-1)[0]!.getCenter()).toEqual(L.latLng(projectMapPosition(record)!));
    expect(basemapSchema.safeParse("unknown-provider").success).toBe(false);
  });

  it("all entry points honor P02 eligibility, missing success flags and duplicates", () => {
    const records = [
      restaurant({ id: 1, lat: 22.3, lon: 114.17 }), restaurant({ id: 2, lat: 22.3, lon: 114.17, geocode_success: null }),
      restaurant({ id: 3 }), restaurant({ id: 4, lat: 0, lon: 0 }), restaurant({ id: 5, lat: 91, lon: 114 }),
      restaurant({ id: 6, lat: NaN, lon: 114 }), restaurant({ id: 7, lat: 22, lon: Infinity }),
      restaurant({ id: 8, lat: 22.3, lon: 114.17, geocode_success: false }), restaurant({ id: 9, lat: 22, lon: null }),
    ];
    const ref = createRef<MapShellHandle>(); render(<MapShell ref={ref} {...props(records)} />);
    const markerIds: number[] = []; records.forEach((record) => { if (createRestaurantMarker(record)) markerIds.push(record.id); });
    expect(markerIds).toEqual([1, 2]);
    act(() => ref.current!.toggleMode());
    expect(vi.mocked(L.heatLayer).mock.calls.slice(-1)[0]![0]).toHaveLength(markerIds.length);
    const map = createdMaps[0]!;
    records.slice(2).forEach((record) => act(() => ref.current!.flyToRestaurant(record)));
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("context switches rebuild valid layers, invalidate old callbacks and notify heat -> marker", () => {
    const hk = restaurant({ lat: 22.3, lon: 114.17 }); const mo = restaurant({ lat: 22.166, lon: 113.559 });
    const ref = createRef<MapShellHandle>(), onModeChange = vi.fn();
    const open = vi.spyOn(L.Popup.prototype, "openOn");
    const view = render(<MapShell ref={ref} {...props([hk])} selection={{ record: hk }} onModeChange={onModeChange} />);
    act(() => { ref.current!.toggleMode(); ref.current!.flyToRestaurant(hk); });
    expect(onModeChange.mock.calls.map(([mode]) => mode)).toEqual(["heat", "marker"]);
    view.rerender(<MapShell ref={ref} {...props([mo], { coordinateSystem: "unknown" })} center={[22.166, 113.559]} onModeChange={onModeChange} />);
    act(() => ref.current!.flyToRestaurant(hk));
    expect(open).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector(".leaflet-popup-content")).toBeNull();
    act(() => ref.current!.flyToRestaurant(mo)); expect(createdMaps.slice(-1)[0]!.flyTo).toHaveBeenCalledTimes(1); // shared prototype spy: only initial HK flight
    expect(view.getByText(/空间信息暂不可用/)).toBeTruthy();
    act(() => ref.current!.toggleMode()); expect(vi.mocked(L.heatLayer).mock.calls.slice(-1)[0]![0]).toEqual([]);
    view.rerender(<MapShell ref={ref} {...props([mo], { coordinateSystem: "WGS84" })} center={[22.166, 113.559]} onModeChange={onModeChange} />);
    expect(createdMaps.slice(-1)[0]!.getCenter()).toEqual(L.latLng(projectMapPosition(mo)!));
    expect(vi.mocked(L.heatLayer).mock.calls.slice(-1)[0]![0]).toEqual([[...projectMapPosition(mo)!, 0.8]]);
  });

  it("unknown/invalid context is rejected by markers, heat, user position and P02 counts", () => {
    const record = restaurant({ lat: 22.3, lon: 114.17 });
    for (const context of [{ coordinateSystem: "unknown" } as const, { bounds: [30, 120, 32, 122] as [number, number, number, number] }]) {
      expect(getMapPosition(record, context)).toBeNull(); expect(createRestaurantMarker(record, { spatialContext: context })).toBeNull();
      const div = document.createElement("div"); document.body.append(div); const map = L.map(div).setView([22, 114], 10);
      const heat = new HeatLayerManager(map); heat.show([record], context); expect(L.heatLayer).toHaveBeenLastCalledWith([], expect.any(Object));
      const user = new UserLocationMarker(map); user.update({ lat: 22.3, lon: 114.17, accuracy: 10, heading: null }, context); expect(user.isActive()).toBe(false);
      heat.remove();
    }
  });

  it.each([false, true])("P08 selection alone drives marker rings and popup dismissal (mobile=%s)", (mobileDetails) => {
    const a = restaurant({ id: 1, name: "A", lat: 22.3, lon: 114.17 });
    const b = restaurant({ id: 2, name: "B", lat: 22.31, lon: 114.18 });
    const records = [a, b], onRestaurantClose = vi.fn(), onRestaurantSelect = vi.fn();
    const options = { ...props(records), onRestaurantClose, onRestaurantSelect, mobileDetails };
    const view = render(<MapShell {...options} selection={{ record: a }} />);
    const map = createdMaps[0]!;
    let markers: L.Marker[] = [];
    map.eachLayer((layer) => { if (layer instanceof L.MarkerClusterGroup) markers = layer.getLayers() as L.Marker[]; });
    const [markerA, markerB] = markers;
    // Model cluster add/remove with real Leaflet elements; add must read current selection.
    act(() => { markerA!.addTo(map); markerB!.addTo(map); });
    expect(markerA!.getElement()?.classList.contains("restaurant-marker--selected")).toBe(true);
    expect(markerB!.getElement()?.classList.contains("restaurant-marker--selected")).toBe(false);
    view.rerender(<MapShell {...options} selection={{ record: b }} />);
    expect(markerA!.getElement()?.classList.contains("restaurant-marker--selected")).toBe(false);
    expect(markerB!.getElement()?.classList.contains("restaurant-marker--selected")).toBe(true);
    expect(onRestaurantClose).not.toHaveBeenCalled(); // replacing A's popup cannot clear B
    act(() => { markerB!.remove(); markerB!.addTo(map); });
    expect(markerB!.getElement()?.classList.contains("restaurant-marker--selected")).toBe(true);
    if (!mobileDetails) {
      expect(view.container.querySelector(".popup h2")?.textContent).toBe("B");
      act(() => { map.closePopup(); });
      expect(onRestaurantClose).toHaveBeenCalledExactlyOnceWith(b);
    }
    view.rerender(<MapShell {...options} selection={null} />);
    expect(view.container.querySelector(".restaurant-marker--selected")).toBeNull();
    expect(view.container.querySelector(".popup")).toBeNull();
    act(() => markerA!.fire("click"));
    expect(onRestaurantSelect).toHaveBeenCalledExactlyOnceWith(a);
    expect(markerA!.getElement()?.classList.contains("restaurant-marker--selected")).toBe(false); // waits for App state
    view.unmount();
  });

  it("P08 real mouse preclick/close/click can reactivate the same selected record", () => {
    const record = restaurant({ name: "A", lat: 22.3, lon: 114.17 });
    const options = props([record]); // Stable inputs must not accidentally trigger resynchronization.
    function Harness() {
      const [selection, setSelection] = useState<{ record: typeof record } | null>(null);
      return <>
        <button onClick={() => setSelection({ record })}>Search A</button>
        <MapShell {...options} selection={selection}
          onRestaurantSelect={(record) => setSelection({ record })}
          onRestaurantClose={(record) => setSelection((current) => current?.record === record ? null : current)} />
      </>;
    }
    const view = render(<Harness />);
    const map = createdMaps[0]!;
    let marker: L.Marker | undefined;
    map.eachLayer((layer) => { if (layer instanceof L.MarkerClusterGroup) marker = layer.getLayers()[0] as L.Marker; });
    act(() => { marker!.addTo(map); });
    const expectOpen = () => {
      expect(view.container.querySelectorAll(".popup")).toHaveLength(1);
      expect(view.container.querySelector(".popup h2")?.textContent).toBe("A");
      expect(view.container.querySelectorAll(".restaurant-marker--selected")).toHaveLength(1);
    };
    for (let click = 0; click < 3; click++) { fireEvent.click(marker!.getElement()!); expectOpen(); }
    fireEvent.click(view.getByText("Search A")); expectOpen();
    fireEvent.click(view.container.querySelector(".leaflet-popup-close-button")!);
    expect(view.container.querySelector(".popup")).toBeNull();
    expect(view.container.querySelector(".restaurant-marker--selected")).toBeNull();
    fireEvent.click(marker!.getElement()!); expectOpen();
  });

  it("P08 cancels a pending Leaflet zoom completion before dataset/layout teardown", () => {
    const view = render(<MapShell {...props([restaurant({ lat: 22.3, lon: 114.17 })])} />);
    const map = createdMaps[0]! as L.Map & { _animateZoom: (center: L.LatLng, zoom: number, start: boolean) => void };
    // Exercise Leaflet's actual 250ms transition fallback, which remove() does not cancel.
    act(() => map._animateZoom(map.getCenter(), 13, true));
    view.unmount();
    expect(() => vi.runOnlyPendingTimers()).not.toThrow();
  });

  it("10 real MapShell mounts/layout/center changes clean maps, controls and timers", () => {
    const record = restaurant({ lat: 22.3, lon: 114.17 });
    for (let i = 0; i < 10; i++) {
      const ref = createRef<MapShellHandle>(); const view = render(<MapShell ref={ref} {...props([record])} />);
      act(() => ref.current!.toggleMode());
      view.rerender(<MapShell ref={ref} {...props([record])} hideControls center={[22.166, 113.559]} />);
      expect(view.container.querySelectorAll(".leaflet-container")).toHaveLength(1);
      expect(view.container.querySelectorAll(".loc-btn")).toHaveLength(1);
      view.unmount(); expect(vi.getTimerCount()).toBe(0);
    }
  });
});

describe("P05-R6 tile fault isolation", () => {
  it.each<BasemapId>(["amap", "gsi-standard"])("%s ignores one failed tile, reports sustained failures, recovers and discards old-layer events", (basemap) => {
    const div = document.createElement("div"); document.body.append(div); const map = L.map(div).setView([22, 114], 10);
    const report = vi.fn(); const factory = vi.spyOn(L, "tileLayer"); const service = new TileService(map, report, basemap);
    const first = factory.mock.results[0]!.value as L.TileLayer;
    first.fire("tileerror"); vi.advanceTimersByTime(2000); expect(report).not.toHaveBeenCalledWith("unavailable");
    first.fire("tileerror"); first.fire("tileerror"); vi.advanceTimersByTime(1500); expect(report).toHaveBeenLastCalledWith("unavailable");
    first.fire("tileload"); expect(report).toHaveBeenLastCalledWith("available");
    service.retry(); const second = factory.mock.results[1]!.value as L.TileLayer;
    const count = report.mock.calls.length; first.fire("tileerror"); first.fire("tileload"); expect(report).toHaveBeenCalledTimes(count);
    second.fire("tileerror"); second.fire("tileerror"); second.fire("tileerror");
    service.remove(); vi.advanceTimersByTime(2000); expect(report).toHaveBeenCalledTimes(count); expect(vi.getTimerCount()).toBe(0);
  });
});

it("P05-R4 cancels the heat plugin's pending animation before removing the layer", () => {
  const div = document.createElement("div"); document.body.append(div); const map = L.map(div).setView([22, 114], 10);
  const layer = L.layerGroup() as unknown as L.HeatLayer & { _frame: number | null };
  const draw = vi.fn(); layer._frame = L.Util.requestAnimFrame(draw);
  vi.mocked(L.heatLayer).mockReturnValueOnce(layer);
  const heat = new HeatLayerManager(map); heat.show([restaurant({ lat: 22.3, lon: 114.17 })]);
  heat.remove(); vi.advanceTimersByTime(100);
  expect(draw).not.toHaveBeenCalled(); expect(layer._frame).toBeNull(); expect(map.hasLayer(layer)).toBe(false);
});
