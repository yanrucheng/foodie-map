import type { BasemapId } from "@/config/basemaps";
import type { Restaurant } from "@/types/restaurant";
import L from "@/lib/leaflet";
import { getGroupLabel, type CuisineGroup } from "@/config/restaurantPresentation";
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
      <div class="tags"><span class="detail-symbol" style="background:${facts.groupStyle.color};color:${facts.groupStyle.textColor}">${facts.category.svg}</span>${facts.tags.map((tag, index) => `<span class="tag"${index === 0 ? ` style="background:${facts.groupStyle.color};color:${facts.groupStyle.textColor}"` : ""}>${escapeHtml(tag)}</span>`).join("")}</div>
      ${facts.details.map(([label, value]) => `<div class="line"><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</div>`).join("")}
      ${facts.guideUrl ? `<div class="line"><a href="${escapeHtml(facts.guideUrl)}" target="_blank" rel="noopener noreferrer">查看米其林官方页面</a></div>` : ""}
    </div>`;
}

interface CreateMarkerOptions {
  basemap?: BasemapId;
  groups?: CuisineGroup[];
  spatialContext?: SpatialContext;
  /** If provided, pointer/keyboard activation updates the owner's selection. */
  onClick?: (restaurant: Restaurant) => void;
}

/**
 * Creates a marker with local visual encoding. MapShell supplies the shared selection
 * callback for both layouts; standalone consumers may use the fallback bound popup.
 */
export function createRestaurantMarker(
  item: Restaurant,
  options?: CreateMarkerOptions
): L.Marker | null {
  const position = projectMapPosition(item, options?.spatialContext, options?.basemap);
  if (!position) return null;
  const facts = restaurantFacts(item, getGroupLabel(item.cuisine_group, options?.groups), options?.spatialContext);
  const groupStyle = facts.groupStyle;
  const className = item.is_new ? "marker-dot new" : "marker-dot";
  const [lat, lng] = position;

  const marker = L.marker([lat, lng], {
    title: `${facts.name} · ${getGroupLabel(item.cuisine_group, options?.groups)} · ${facts.category.label}${facts.priceGrade.tier ? ` · 价格等级 ${facts.priceGrade.tier}，共 4 档` : ""}${item.is_new ? ` · ${item.edition_year} 新晋` : ""}`,
    icon: L.divIcon({
      className: "restaurant-marker",
      html: `<div class="${className}" style="background:${groupStyle.color};color:${groupStyle.textColor}">${facts.category.svg}${facts.priceGrade.badge ? `<span class="price-badge" aria-hidden="true">${facts.priceGrade.badge}</span>` : ""}</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -38],
    }),
  });

  // Store restaurant reference on marker for event handlers
  (marker as L.Marker & { __restaurant?: Restaurant }).__restaurant = item;

  marker.on("add", () => marker.getElement()?.setAttribute("aria-label", marker.options.title!));
  if (options?.onClick) {
    // Callback-driven details also need keyboard activation (normally added by bindPopup).
    marker.on("click", () => options.onClick!(item));
    marker.on("keypress", (event: L.LeafletKeyboardEvent) => {
      if (event.originalEvent.key === "Enter" || event.originalEvent.key === " ") {
        L.DomEvent.preventDefault(event.originalEvent);
        options.onClick!(item);
      }
    });
  } else {
    // Desktop: bind popup as before
    marker.bindPopup(popupHtml(item, options?.groups, options?.spatialContext));
  }

  return marker;
}
