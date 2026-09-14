import { useEffect, useState } from "react";

export function useReleaseStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine);
    const update = () => setWaiting(true);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    window.addEventListener("foodie-update-ready", update);
    let disposed = false;
    void navigator.serviceWorker?.getRegistration().then((registration) => { if (!disposed && registration?.waiting) setWaiting(true); });
    return () => { disposed = true; window.removeEventListener("online", connectivity); window.removeEventListener("offline", connectivity); window.removeEventListener("foodie-update-ready", update); };
  }, []);
  return { online, waiting };
}
