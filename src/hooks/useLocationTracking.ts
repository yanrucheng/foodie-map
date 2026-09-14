import type { BasemapId } from "@/config/basemaps";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { SpatialContext } from "@/data/contract";
import { LocationButton } from "@/components/LocationButton";
import { UserLocationMarker } from "@/components/UserLocationMarker";
import { projectMapPosition } from "@/utils/mapPosition";
import { useGeolocation, type PositionFix, type LocationFailure } from "./useGeolocation";
import { useDeviceOrientation } from "./useDeviceOrientation";

export const LOCATION_SESSION_MS = 5 * 60 * 1000;
interface Session { deadline: number; timer: ReturnType<typeof setTimeout>; firstFix: boolean }
interface Binding { map: LeafletMap; marker: UserLocationMarker; button: LocationButton; spatialContext?: SpatialContext; basemap?: BasemapId }

/** A user-started, fixed-deadline session. Background time counts; updates never extend it. */
export function useLocationTracking() {
  const { start: startGeo, stop: stopGeo } = useGeolocation();
  const { start: startOrientation, stop: stopOrientation } = useDeviceOrientation();
  const binding = useRef<Binding | null>(null);
  const session = useRef<Session | null>(null);
  const fix = useRef<PositionFix | null>(null);
  const heading = useRef<number | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    const current = session.current;
    session.current = null;
    if (current) clearTimeout(current.timer);
    stopGeo();
    stopOrientation();
    fix.current = null;
    heading.current = null;
    binding.current?.marker.remove();
    binding.current?.button.setState("inactive");
  }, [stopGeo, stopOrientation]);

  const expire = useCallback(() => {
    stop();
    setLocationMessage("本次定位已满 5 分钟，已停止。可点击定位按钮重新开启。");
  }, [stop]);

  const sample = useCallback((current: Session, userGesture: boolean) => {
    const valid = () => {
      if (session.current !== current || !binding.current) return false;
      if (Date.now() >= current.deadline) { expire(); return false; }
      return !document.hidden;
    };
    const fail = (error: LocationFailure) => {
      if (session.current !== current) return;
      stop();
      const messages: Record<number, string> = {
        0: "此浏览器不支持定位。", 1: "定位权限被拒绝，请在浏览器设置中允许后重试。",
        2: "定位服务暂不可用，可点击定位按钮重试。", 3: "定位超时，可点击定位按钮重试。",
      };
      setLocationMessage(messages[error.code] ?? "定位失败，可点击定位按钮重试。");
    };
    // Request orientation permission synchronously within the initiating user gesture.
    void startOrientation((value) => {
      if (!valid()) return;
      heading.current = value;
      const target = binding.current;
      if (target && fix.current) target.marker.update({ ...fix.current, heading: value }, target.spatialContext, target.basemap);
    }, userGesture);
    startGeo((value) => {
      if (!valid()) return;
      const target = binding.current!;
      const position = projectMapPosition(value, target.spatialContext, target.basemap);
      if (!position || !Number.isFinite(value.accuracy) || value.accuracy < 0) {
        fail({ code: 2, message: "Invalid position" }); return;
      }
      fix.current = value;
      target.marker.update({ ...value, heading: heading.current }, target.spatialContext, target.basemap);
      target.button.setState("tracking");
      if (current.firstFix) {
        current.firstFix = false;
        target.map.flyTo(position, 15, { duration: 0.6 });
      }
    }, fail);
  }, [expire, startGeo, startOrientation, stop]);

  const start = useCallback(() => {
    stop();
    if (!binding.current) return;
    setLocationMessage(null);
    const current: Session = {
      deadline: Date.now() + LOCATION_SESSION_MS,
      timer: setTimeout(() => { if (session.current === current) expire(); }, LOCATION_SESSION_MS), firstFix: true,
    };
    session.current = current;
    binding.current.button.setState("locating");
    if (!document.hidden) sample(current, true);
  }, [expire, sample, stop]);

  useEffect(() => {
    const visibility = () => {
      const current = session.current;
      if (!current) return;
      if (Date.now() >= current.deadline) { expire(); return; }
      if (document.hidden) {
        stopGeo(); stopOrientation();
        fix.current = null; heading.current = null;
        binding.current?.marker.remove();
        binding.current?.button.setState("locating");
      } else sample(current, false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); stop(); };
  }, [expire, sample, stop, stopGeo, stopOrientation]);

  /** Detach before map.remove(): no marker manager or button can retain a destroyed map. */
  const attachTo = useCallback((map: LeafletMap, spatialContext?: SpatialContext, basemap?: BasemapId) => {
    stop();
    const button = new LocationButton({ onActivate: start, onDeactivate: () => { stop(); setLocationMessage(null); } });
    const target: Binding = { map, button, marker: new UserLocationMarker(map), spatialContext, basemap };
    binding.current = target;
    button.addTo(map);
    setLocationMessage(null);
    return () => {
      if (binding.current !== target) return;
      stop();
      button.remove(map);
      binding.current = null;
    };
  }, [start, stop]);

  return { attachTo, locationMessage };
}
