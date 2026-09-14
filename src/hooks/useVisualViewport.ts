import { useEffect } from "react";

/** UI geometry only: keep modal content inside the area left by browser chrome/keyboard. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--visible-height", `${viewport?.height ?? window.innerHeight}px`);
      root.style.setProperty("--visible-top", `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--visible-height"); root.style.removeProperty("--visible-top");
    };
  }, []);
}
