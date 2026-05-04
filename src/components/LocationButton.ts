import type { Map as LeafletMap, Control } from "leaflet";

/** Tracking state for the location button. */
export type LocationButtonState = "inactive" | "locating" | "tracking";

/** Callbacks emitted by the location button. */
export interface LocationButtonCallbacks {
  onActivate: () => void;
  onDeactivate: () => void;
}

/**
 * Leaflet map control that renders a "locate me" button.
 * Manages three visual states: inactive → locating → tracking.
 * Emits onActivate when user taps to start, onDeactivate when tapped again to stop.
 */
export class LocationButton {
  private control: Control | null = null;
  private button: HTMLButtonElement | null = null;
  private state: LocationButtonState = "inactive";
  private callbacks: LocationButtonCallbacks;

  constructor(callbacks: LocationButtonCallbacks) {
    this.callbacks = callbacks;
  }

  /** SVG icon for each state. */
  private getIcon(): string {
    switch (this.state) {
      case "inactive":
        return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
        </svg>`;
      case "locating":
        return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="loc-btn-spin">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
        </svg>`;
      case "tracking":
        return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
        </svg>`;
    }
  }

  /** Updates the button visual to match current state. */
  private render(): void {
    if (!this.button) return;
    this.button.innerHTML = this.getIcon();
    this.button.className = `loc-btn loc-btn--${this.state}`;
    this.button.setAttribute("aria-label", this.getAriaLabel());
  }

  /** Descriptive label for accessibility. */
  private getAriaLabel(): string {
    switch (this.state) {
      case "inactive":
        return "Show my location";
      case "locating":
        return "Acquiring location…";
      case "tracking":
        return "Stop location tracking";
    }
  }

  /** Adds the control to the map. */
  addTo(map: LeafletMap, position: L.ControlPosition = "bottomright"): void {
    const LocationControl = L.Control.extend({
      options: { position },
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar loc-btn-container");
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        this.button = L.DomUtil.create("button", "loc-btn loc-btn--inactive", container);
        this.button.type = "button";
        this.button.innerHTML = this.getIcon();
        this.button.setAttribute("aria-label", this.getAriaLabel());

        this.button.addEventListener("click", () => this.handleClick());

        return container;
      },
    });

    this.control = new LocationControl();
    map.addControl(this.control);
  }

  /** Handles button tap — toggles between inactive/tracking. */
  private handleClick(): void {
    if (this.state === "inactive") {
      this.setState("locating");
      this.callbacks.onActivate();
    } else {
      this.setState("inactive");
      this.callbacks.onDeactivate();
    }
  }

  /** Programmatically sets the button state. Used by the integration layer. */
  setState(newState: LocationButtonState): void {
    this.state = newState;
    this.render();
  }

  /** Returns the current button state. */
  getState(): LocationButtonState {
    return this.state;
  }

  /** Removes the control from the map. */
  remove(map: LeafletMap): void {
    if (this.control) {
      map.removeControl(this.control);
      this.control = null;
      this.button = null;
    }
    this.state = "inactive";
  }
}
