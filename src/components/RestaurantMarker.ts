import type { Restaurant } from "@/types/restaurant";
import { cuisineGroups } from "@/config/cuisineGroups";

/** Escapes HTML entities for safe popup rendering. */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Generates popup HTML for a restaurant marker. */
function popupHtml(item: Restaurant): string {
  const fallbackNote =
    item.geo_source === "district_fallback"
      ? `<div class="line"><strong>定位方式：</strong>区域 fallback（地图位置为近似点）</div>`
      : "";
  const newTag = item.is_new ? '<span class="tag">2026 新晋</span>' : "";
  const michelinLine = item.michelin_url
    ? `<div class="line"><a href="${item.michelin_url}" target="_blank" rel="noreferrer">查看米其林官方页面</a></div>`
    : "";

  return `
    <div class="popup">
      <h3>${escapeHtml(item.name_zh)}</h3>
      <div class="en">${escapeHtml(item.name_en)}</div>
      <div class="tags">
        <span class="tag">${escapeHtml(item.cuisine)}</span>
        <span class="tag">${escapeHtml(item.cuisine_group)}</span>
        ${newTag}
      </div>
      <div class="line"><strong>区域：</strong>${escapeHtml(item.area)}</div>
      <div class="line"><strong>地址：</strong>${escapeHtml(item.address || "未提供")}</div>
      <div class="line"><strong>人均：</strong>${escapeHtml(item.avg_price_hkd || "未提供")}</div>
      <div class="line"><strong>招牌菜：</strong>${escapeHtml(item.signature_dishes || "未提供")}</div>
      ${fallbackNote}
      ${michelinLine}
    </div>`;
}

/** Creates a Leaflet marker with styled dot icon and popup for a restaurant. */
export function createRestaurantMarker(item: Restaurant): L.Marker {
  const groupStyle = cuisineGroups[item.cuisine_group] ?? cuisineGroups["西餐 / 其他"]!;
  const className = item.is_new ? "marker-dot new" : "marker-dot";

  const marker = L.marker([item.lat, item.lon], {
    title: `${item.name_zh} / ${item.name_en}`,
    icon: L.divIcon({
      className: "",
      html: `<div class="${className}" style="background:${groupStyle.color}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -12],
    }),
  }).bindPopup(popupHtml(item));

  return marker;
}
