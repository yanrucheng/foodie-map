import { cuisineGroups } from "@/config/cuisineGroups";

/** Creates the Leaflet filter control (L.Control extension) for cuisine group filtering. */
export function createFilterControl(
  activeGroups: Set<string>,
  onToggle: (group: string) => void,
  onModeToggle: () => void,
  currentMode: "marker" | "heat"
): L.Control {
  const FilterControl = L.Control.extend({
    options: { position: "topleft" as const },

    onAdd() {
      const container = L.DomUtil.create("div", "floating-card control-block");
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      const title = L.DomUtil.create("div", "control-title", container);
      title.textContent = "菜系筛选";

      const filterList = L.DomUtil.create("div", "filter-list", container);

      Object.entries(cuisineGroups).forEach(([label, style]) => {
        const row = L.DomUtil.create("label", "filter-item", filterList);
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = activeGroups.has(label);
        checkbox.dataset.group = label;
        row.appendChild(checkbox);

        const swatch = L.DomUtil.create("span", "swatch", row);
        swatch.style.background = style.color;

        const text = L.DomUtil.create("span", "", row);
        text.textContent = label;
      });

      filterList.addEventListener("change", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        const group = target.dataset.group;
        if (!group) return;
        onToggle(group);
      });

      const modeBtn = L.DomUtil.create("button", "mode-btn", container);
      modeBtn.textContent = currentMode === "marker" ? "切换到热力图" : "切换到标记模式";
      modeBtn.addEventListener("click", onModeToggle);

      return container;
    },
  });

  return new FilterControl();
}
