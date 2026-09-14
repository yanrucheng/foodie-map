import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { release } from "./data/release";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/** Register service worker for offline shell caching (production only). */
if ("serviceWorker" in navigator && import.meta.env.PROD && release) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
      const notify = () => { if (registration.waiting && registration.active?.state === "activated") window.dispatchEvent(new Event("foodie-update-ready")); };
      notify();
      registration.addEventListener("updatefound", () => registration.installing?.addEventListener("statechange", notify));
    }).catch((error: unknown) => console.warn("Foodie Map offline setup unavailable", error));
  });
}
