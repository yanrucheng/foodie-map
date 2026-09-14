// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import L from "@/lib/leaflet";
import { useLocationTracking, LOCATION_SESSION_MS } from "@/hooks/useLocationTracking";
import { absoluteHeading } from "@/hooks/useDeviceOrientation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { projectMapPosition } from "@/utils/mapPosition";
import type { BasemapId } from "@/config/basemaps";

let watches: Map<number, { success: PositionCallback; error: PositionErrorCallback }>;
let callbacks: Map<number, { success: PositionCallback; error: PositionErrorCallback }>;
let serial: number;
let maps: L.Map[];
let hidden: boolean;
let watchPosition: ReturnType<typeof vi.fn>;
let permission: ReturnType<typeof vi.fn>;
let orientationListeners: Set<EventListenerOrEventListenerObject>;
const position = (accuracy = 25): GeolocationPosition => ({ coords: { latitude: 22.3, longitude: 114.17, accuracy } }) as GeolocationPosition;
const error = (code: number): GeolocationPositionError => ({ code, message: "test" }) as GeolocationPositionError;
function map() {
  const container = document.createElement("div"); document.body.append(container);
  const result = L.map(container, { zoomAnimation: false }).setView([22.3, 114.17], 12);
  vi.spyOn(result, "flyTo").mockReturnValue(result);
  maps.push(result); return result;
}
function button(target: L.Map) { return target.getContainer().querySelector<HTMLButtonElement>(".loc-btn")!; }
function click(target: L.Map) { act(() => button(target).click()); }
function visibility(value: boolean) { act(() => { hidden = value; document.dispatchEvent(new Event("visibilitychange")); }); }
function circles(target: L.Map) { const found: L.Circle[] = []; target.eachLayer((layer) => { if (layer instanceof L.Circle) found.push(layer); }); return found; }

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-13T00:00:00Z"));
  watches = new Map(); callbacks = new Map(); serial = 0; maps = []; hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  watchPosition = vi.fn((success: PositionCallback, failure: PositionErrorCallback) => {
    const id = ++serial; const pair = { success, error: failure }; watches.set(id, pair); callbacks.set(id, pair); return id;
  });
  vi.stubGlobal("navigator", { geolocation: { watchPosition, clearWatch: vi.fn((id: number) => watches.delete(id)) } });
  permission = vi.fn().mockResolvedValue("granted");
  vi.stubGlobal("DeviceOrientationEvent", class { static requestPermission = permission; });
  orientationListeners = new Set();
  const add = window.addEventListener.bind(window), remove = window.removeEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    if (type.startsWith("deviceorientation")) orientationListeners.add(listener); add(type, listener, options);
  });
  vi.spyOn(window, "removeEventListener").mockImplementation((type, listener, options) => {
    if (type.startsWith("deviceorientation")) orientationListeners.delete(listener); remove(type, listener, options);
  });
});
afterEach(() => { cleanup(); maps.forEach((m) => { m.remove(); m.getContainer().remove(); }); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("P05-R4/R5 fixed-deadline user sessions (real React, fake browser sensors/time)", () => {
  it.each<BasemapId>(["amap", "gsi-standard"])("%s requests nothing before a gesture and updates an unchanged position's accuracy", async (basemap) => {
    const target = map(); const { result, unmount } = renderHook(useLocationTracking);
    act(() => { result.current.attachTo(target, undefined, basemap); });
    expect(watchPosition).not.toHaveBeenCalled(); expect(permission).not.toHaveBeenCalled();
    click(target); await act(async () => {});
    act(() => callbacks.get(1)!.success(position(150)));
    expect(circles(target)[0]!.getRadius()).toBe(150);
    expect(target.flyTo).toHaveBeenCalledWith(projectMapPosition({ lat: 22.3, lon: 114.17 }, undefined, basemap), 15, { duration: 0.6 });
    act(() => callbacks.get(1)!.success(position(8)));
    expect(circles(target)[0]!.getRadius()).toBe(8); expect(target.flyTo).toHaveBeenCalledTimes(1);
    unmount(); expect(watches.size).toBe(0); expect(orientationListeners.size).toBe(0); expect(circles(target)).toHaveLength(0);
  });

  it("updates/rerenders never extend five minutes; background counts and expiry permits a new gesture", async () => {
    const target = map(); const { result, rerender } = renderHook(useLocationTracking);
    act(() => { result.current.attachTo(target); }); click(target); await act(async () => {});
    act(() => { vi.advanceTimersByTime(120_000); callbacks.get(1)!.success(position()); }); rerender();
    visibility(true); expect(watches.size).toBe(0); expect(orientationListeners.size).toBe(0);
    act(() => vi.advanceTimersByTime(60_000)); visibility(false); await act(async () => {});
    expect(watches.size).toBe(1); expect(permission).toHaveBeenCalledTimes(1);
    act(() => { callbacks.get(2)!.success(position(5)); vi.advanceTimersByTime(119_999); }); rerender();
    expect(watches.size).toBe(1);
    act(() => vi.advanceTimersByTime(1));
    expect(watches.size).toBe(0); expect(circles(target)).toHaveLength(0); expect(orientationListeners.size).toBe(0);
    expect(result.current.locationMessage).toContain("5 分钟");
    act(() => callbacks.get(2)!.success(position())); expect(circles(target)).toHaveLength(0);
    click(target); expect(watches.size).toBe(1);
  });

  it.each(["manual", "expiry"])("background %s stop cannot resume on visibility change", async (kind) => {
    const target = map(); const { result } = renderHook(useLocationTracking);
    act(() => { result.current.attachTo(target); }); click(target); await act(async () => {});
    visibility(true);
    if (kind === "manual") click(target); else act(() => vi.advanceTimersByTime(LOCATION_SESSION_MS));
    visibility(false); expect(watchPosition).toHaveBeenCalledTimes(1); expect(watches.size).toBe(0);
  });

  it.each([1, 2, 3])("failure %i clears a previous fix, ends session, stays stable and allows retry", async (code) => {
    const target = map(); const { result, rerender } = renderHook(useLocationTracking);
    act(() => { result.current.attachTo(target); }); click(target); await act(async () => {});
    act(() => callbacks.get(1)!.success(position())); expect(circles(target)).toHaveLength(1);
    act(() => callbacks.get(1)!.error(error(code))); rerender();
    expect(result.current.locationMessage).toBeTruthy(); expect(watches.size).toBe(0); expect(circles(target)).toHaveLength(0);
    expect(orientationListeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    visibility(true); visibility(false); expect(watchPosition).toHaveBeenCalledTimes(1);
    click(target); expect(watches.size).toBe(1);
    act(() => { callbacks.get(1)!.success(position()); callbacks.get(1)!.error(error(2)); });
    expect(watches.size).toBe(1); expect(circles(target)).toHaveLength(0);
  });

  it("unsupported geolocation reports once and clears even pending orientation authorization", async () => {
    vi.stubGlobal("navigator", {});
    const target = map(); const { result, rerender } = renderHook(useLocationTracking);
    act(() => { result.current.attachTo(target); }); click(target); await act(async () => {}); rerender();
    expect(result.current.locationMessage).toContain("不支持"); expect(orientationListeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["stop", "unmount", "background"])("late permission after %s cannot subscribe", async (kind) => {
    let grant!: (value: string) => void;
    permission.mockImplementation(() => new Promise((resolve) => { grant = resolve; }));
    const target = map(); const { result, unmount } = renderHook(useLocationTracking);
    act(() => { result.current.attachTo(target); }); click(target);
    if (kind === "stop") click(target); else if (kind === "unmount") unmount(); else visibility(true);
    await act(async () => grant("granted")); expect(orientationListeners.size).toBe(0);
    if (kind === "background") { visibility(false); await act(async () => {}); expect(permission).toHaveBeenCalledTimes(1); }
  });

  it("detaches before map destruction, invalidates old fixes and binds only the new map", async () => {
    const first = map(), second = map(); const { result, unmount } = renderHook(useLocationTracking);
    let detach!: () => void;
    act(() => { detach = result.current.attachTo(first); }); click(first); await act(async () => {});
    act(() => callbacks.get(1)!.success(position()));
    act(() => { detach(); result.current.attachTo(second); });
    expect(first.getContainer().querySelector(".loc-btn")).toBeNull(); expect(circles(first)).toHaveLength(0);
    act(() => callbacks.get(1)!.success(position())); expect(circles(second)).toHaveLength(0);
    click(second); await act(async () => {}); act(() => callbacks.get(2)!.success(position()));
    expect(circles(second)).toHaveLength(1); unmount(); expect(watches.size).toBe(0);
  });

  it("queued deadline from an ended session cannot stop a new session", () => {
    const timer = vi.spyOn(globalThis, "setTimeout");
    const target = map(); const { result } = renderHook(useLocationTracking);
    act(() => { result.current.attachTo(target); }); click(target);
    const deadline = timer.mock.calls.find(([, delay]) => delay === LOCATION_SESSION_MS)![0] as () => void;
    click(target); click(target);
    act(deadline); expect(watches.size).toBe(1); expect(result.current.locationMessage).toBeNull();
  });

  it("10 mount/unmount cycles leave no owned watch, orientation or visibility listeners or timers", async () => {
    const add = vi.spyOn(document, "addEventListener"), remove = vi.spyOn(document, "removeEventListener");
    for (let i = 0; i < 10; i++) {
      const target = map(); const { result, unmount } = renderHook(useLocationTracking);
      let detach!: () => void; act(() => { detach = result.current.attachTo(target); });
      click(target); await act(async () => {}); act(() => callbacks.get(serial)!.success(position()));
      act(detach); unmount();
      expect(watches.size).toBe(0); expect(orientationListeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
      expect(target.getContainer().querySelectorAll(".loc-btn")).toHaveLength(0);
    }
    expect(add.mock.calls.filter(([type]) => type === "visibilitychange")).toHaveLength(10);
    expect(remove.mock.calls.filter(([type]) => type === "visibilitychange")).toHaveLength(10);
  });
});

it("P05-R5 never presents relative alpha or invalid compass data as true north", () => {
  const event = (value: object) => value as DeviceOrientationEvent;
  expect(absoluteHeading(event({ alpha: 30, absolute: false }))).toBeNull();
  expect(absoluteHeading(event({ alpha: 30, absolute: true }))).toBe(330);
  expect(absoluteHeading(event({ webkitCompassHeading: 45, webkitCompassAccuracy: -1 }))).toBeNull();
  expect(absoluteHeading(event({ webkitCompassHeading: 45, webkitCompassAccuracy: 5 }))).toBe(45);
});

it("P05-R4 geolocation adapter rejects queued callbacks from earlier watches", () => {
  const fix = vi.fn(), fail = vi.fn(); const { result, unmount } = renderHook(useGeolocation);
  act(() => result.current.start(fix, fail)); const old = callbacks.get(1)!;
  act(() => { result.current.stop(); result.current.start(fix, fail); old.success(position()); old.error(error(1)); });
  expect(fix).not.toHaveBeenCalled(); expect(fail).not.toHaveBeenCalled(); expect(watches.has(2)).toBe(true);
  unmount(); expect(watches.size).toBe(0);
});
