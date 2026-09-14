import { getMapPosition, hasText, isGuideUrl, type Restaurant, type SpatialContext } from "./contract.ts";

export function displayName(record: Restaurant): string {
  return hasText(record.name_zh) ? record.name_zh : hasText(record.name_en) ? record.name_en : record.name;
}

/** Text remains text: no grade-to-amount conversion, assumed currency or invented average. */
export function displayPrice(record: Restaurant): string | null {
  if (hasText(record.price)) return `${record.currency ? `${record.currency} ` : ""}${record.price}`;
  return hasText(record.price_range) ? `价格等级 ${record.price_range}` : null;
}

export function searchNames(record: Restaurant): string[] {
  return [record.name, record.name_zh, record.name_en].filter(hasText);
}

/** Facts shared by the Leaflet popup and React detail card; layouts own no field rules. */
export function restaurantFacts(record: Restaurant, groupLabel = record.cuisine_group, spatialContext?: SpatialContext) {
  const name = displayName(record);
  const guide = record.guide_type === "michelin-starred" ? "米其林星级" : "米其林必比登";
  const details: [string, string | null | undefined][] = [
    ["区域", record.area],
    ["地址", hasText(record.address) ? record.address : record.address_en],
    ["价格", displayPrice(record)],
    ["招牌菜", record.signature_dishes],
    ["定位", !getMapPosition(record, spatialContext) ? "暂无可靠坐标，无法地图定位" : record.geo_source === "district_fallback" ? "区域近似位置" : null],
    ["坐标来源", record.geo_source],
  ];
  return {
    name,
    secondaryName: hasText(record.name_en) && record.name_en !== name ? record.name_en : null,
    tags: [groupLabel, record.cuisine, `${record.edition_year} ${guide}`, record.star_rating ? `${record.star_rating} 星` : null, record.is_new === true ? `${record.edition_year} 新晋` : null].filter(hasText),
    details: details.filter((entry): entry is [string, string] => hasText(entry[1])),
    guideUrl: hasText(record.guide_url) && isGuideUrl(record.guide_url) ? record.guide_url : null,
  };
}
