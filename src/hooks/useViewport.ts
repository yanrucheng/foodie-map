import { useState, useEffect } from "react";

/** Breakpoint classification based on viewport width. */
export type Breakpoint = "mobile" | "tablet" | "desktop";

export interface ViewportState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const MOBILE_QUERY = "(max-width: 767px)";
const DESKTOP_QUERY = "(min-width: 1024px)";

/** Derives breakpoint from current matchMedia state. */
function resolve(mobile: boolean, desktop: boolean): Breakpoint {
  if (mobile) return "mobile";
  if (desktop) return "desktop";
  return "tablet";
}

/**
 * Reactive viewport hook. Returns breakpoint booleans driven by matchMedia
 * listeners. Updates synchronously on resize/orientation change.
 */
export function useViewport(): ViewportState {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    resolve(
      window.matchMedia(MOBILE_QUERY).matches,
      window.matchMedia(DESKTOP_QUERY).matches,
    ),
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const dq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setBreakpoint(resolve(mq.matches, dq.matches));

    mq.addEventListener("change", update);
    dq.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      dq.removeEventListener("change", update);
    };
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
  };
}
