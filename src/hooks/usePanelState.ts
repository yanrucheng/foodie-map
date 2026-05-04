import { useState, useCallback } from "react";

/** Identifiers for overlay panels managed by the panel state machine. */
export type PanelId = "filter" | "stats" | "legend";

export interface PanelStateResult {
  activePanel: PanelId | null;
  open: (panel: PanelId) => void;
  close: () => void;
  toggle: (panel: PanelId) => void;
}

/**
 * Manages mutually-exclusive panel visibility. Only one panel can be open at
 * a time — opening a new panel closes the previous one. Designed for mobile
 * where overlapping sheets are not allowed.
 */
export function usePanelState(): PanelStateResult {
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);

  /** Opens the specified panel, closing any other open panel. */
  const open = useCallback((panel: PanelId) => setActivePanel(panel), []);

  /** Closes the currently active panel. */
  const close = useCallback(() => setActivePanel(null), []);

  /** Toggles the specified panel: opens it if closed, closes it if open. */
  const toggle = useCallback(
    (panel: PanelId) =>
      setActivePanel((prev) => (prev === panel ? null : panel)),
    [],
  );

  return { activePanel, open, close, toggle };
}
