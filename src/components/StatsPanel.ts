import type { Restaurant } from "@/types/restaurant";

/** Region keys used in stats display. */
const REGIONS = ["港岛", "九龙", "新界", "离岛"] as const;

/** Creates the Leaflet stats panel control (L.Control extension) showing region counts. */
export function createStatsPanel(): { control: L.Control; update: (restaurants: Restaurant[]) => void } {
  let statElements: Record<string, HTMLElement> = {};

  const StatsControl = L.Control.extend({
    options: { position: "topright" as const },

    onAdd() {
      const container = L.DomUtil.create("div", "floating-card stats-panel");
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      const title = L.DomUtil.create("div", "control-title", container);
      title.textContent = "当前可见区域统计";

      const grid = L.DomUtil.create("div", "stats-grid", container);

      REGIONS.forEach((region) => {
        const item = L.DomUtil.create("div", "stat-item", grid);
        const label = L.DomUtil.create("div", "stat-label", item);
        label.textContent = region;
        const value = L.DomUtil.create("div", "stat-value", item);
        value.textContent = "0";
        statElements[region] = value;
      });

      return container;
    },
  });

  const control = new StatsControl();

  /** Updates region stat counts from the given visible restaurant list. */
  function update(restaurants: Restaurant[]): void {
    const counts: Record<string, number> = {};
    REGIONS.forEach((r) => { counts[r] = 0; });
    restaurants.forEach((item) => {
      if (item.major_region in counts) {
        counts[item.major_region] = (counts[item.major_region] ?? 0) + 1;
      }
    });
    REGIONS.forEach((region) => {
      const el = statElements[region];
      if (el) {
        el.textContent = String(counts[region] ?? 0);
      }
    });
  }

  return { control, update };
}
