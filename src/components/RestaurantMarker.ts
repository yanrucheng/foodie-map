import type { BasemapId } from "@/config/basemaps";
import type { Restaurant } from "@/types/restaurant";
import L from "@/lib/leaflet";
import { getGroupStyle, getGroupLabel, type CuisineGroup } from "@/config/cuisineRegistry";
import { projectMapPosition } from "@/utils/mapPosition";
import { type SpatialContext } from "@/data/contract";
import { restaurantFacts } from "@/data/display";

/** Escapes HTML entities for safe popup rendering. */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** External facts are escaped as text; only the shared URL rule can create a link. */
export function popupHtml(item: Restaurant, groups?: CuisineGroup[], spatialContext?: SpatialContext): string {
  const facts = restaurantFacts(item, getGroupLabel(item.cuisine_group, groups), spatialContext);
  return `
    <div class="popup" role="region" aria-label="餐厅详情">
      <h2>${escapeHtml(facts.name)}</h2>
      ${facts.secondaryName ? `<div class="en">${escapeHtml(facts.secondaryName)}</div>` : ""}
      <div class="tags">${facts.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      ${facts.details.map(([label, value]) => `<div class="line"><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</div>`).join("")}
      ${facts.guideUrl ? `<div class="line"><a href="${escapeHtml(facts.guideUrl)}" target="_blank" rel="noopener noreferrer">查看米其林官方页面</a></div>` : ""}
    </div>`;
}

interface CreateMarkerOptions {
  basemap?: BasemapId;
  groups?: CuisineGroup[];
  spatialContext?: SpatialContext;
  /** If provided, marker click triggers this callback instead of popup. */
  onClick?: (restaurant: Restaurant) => void;
}

/**
 * Creates a Leaflet marker with styled dot icon.
 * On desktop: binds popup HTML for marker tap.
 * On mobile (when onClick provided): attaches click handler for custom card display.
 */
export function createRestaurantMarker(
  item: Restaurant,
  options?: CreateMarkerOptions
): L.Marker | null {
  const position = projectMapPosition(item, options?.spatialContext, options?.basemap);
  if (!position) return null;
  const groupStyle = getGroupStyle(item.cuisine_group);
  const className = item.is_new ? "marker-dot new" : "marker-dot";
  const [lat, lng] = position;

  const marker = L.marker([lat, lng], {
    title: item.name,
    icon: L.divIcon({
      className: "",
      html: `<div class="${className}" style="background:${groupStyle.color}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -12],
    }),
  });

  // Store restaurant reference on marker for event handlers
  (marker as L.Marker & { __restaurant?: Restaurant }).__restaurant = item;

  if (options?.onClick) {
    // Mobile: use click handler instead of popup
    marker.on("click", () => options.onClick!(item));
  } else {
    // Desktop: bind popup as before
    marker.bindPopup(popupHtml(item, options?.groups, options?.spatialContext));
  }

  return marker;
}
