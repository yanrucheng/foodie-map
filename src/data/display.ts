import { getGroupStyle, getDiningCategory, parsePriceGrade } from "../config/restaurantPresentation.ts";
import { getMapPosition, hasText, isGuideUrl, type Restaurant, type SpatialContext } from "./contract.ts";

export function displayName(record: Restaurant): string {
  return hasText(record.name_zh) ? record.name_zh : hasText(record.name_en) ? record.name_en : record.name;
}

/** Text remains text: no grade-to-amount conversion, assumed currency or invented average. */
export function displayPrice(record: Restaurant): string | null {
  if (hasText(record.price)) return `${record.currency ? `${record.currency} ` : ""}${record.price}`;
  return hasText(record.price_range) ? `价位 ${parsePriceGrade(record.price_range).badge ?? record.price_range}` : null;
}

export function searchNames(record: Restaurant): string[] {
  return [record.name, record.name_zh, record.name_en].filter(hasText);
}

/** Facts shared by the Leaflet popup and React detail card; layouts own no field rules. */
export function restaurantFacts(record: Restaurant, groupLabel = record.cuisine_group, spatialContext?: SpatialContext) {
  const name = displayName(record);
  const category = getDiningCategory(record.dining_category);
  const priceGrade = parsePriceGrade(record.price_range);
  const categoryLabel = record.dining_category != null ? category.label : null;
  const guide = record.guide_type === "michelin-starred" ? "米其林星级" : "米其林必比登";
  const details: [string, string | null | undefined][] = [
    ["区域", record.area],
    ["地址", hasText(record.address) ? record.address : record.address_en],
    ["价格", hasText(record.price) ? `${record.currency ? `${record.currency} ` : ""}${record.price}` : null],
    ["价位", priceGrade.badge ?? record.price_range],
    ["招牌菜", record.signature_dishes],
    ["定位", !getMapPosition(record, spatialContext) ? "暂无可靠坐标，无法地图定位" : record.geo_source === "district_fallback" ? "区域近似位置" : null],
    ["坐标来源", record.geo_source],
  ];
  return {
    name,
    groupStyle: getGroupStyle(record.cuisine_group),
    category,
    categoryAnnotated: record.dining_category != null,
    priceGrade,
    secondaryName: hasText(record.name_en) && record.name_en !== name ? record.name_en : null,
    tags: [...new Set([categoryLabel, record.cuisine, `${record.edition_year} ${guide}`, record.star_rating ? `${record.star_rating} 星` : null, record.is_new === true ? `${record.edition_year} 新晋` : null].filter(hasText))],
    markerLabel: [name, ...new Set([groupLabel, categoryLabel].filter(hasText)), priceGrade.tier ? `价位第${priceGrade.tier}档` : null, record.is_new ? `${record.edition_year} 新晋` : null].filter(hasText).join(" · "),
    details: details.filter((entry): entry is [string, string] => hasText(entry[1])),
    guideUrl: hasText(record.guide_url) && isGuideUrl(record.guide_url) ? record.guide_url : null,
  };
}
