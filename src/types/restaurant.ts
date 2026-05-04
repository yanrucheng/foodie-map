/** Venue type for secondary filtering (street food / dessert vs. restaurant). */
export type VenueType = "restaurant" | "street_food" | "dessert";

/** A single restaurant entry from the guide data JSON. */
export interface Restaurant {
  id: number;
  name: string;
  name_zh: string;
  name_en: string;
  cuisine: string;
  cuisine_group: string;
  is_new: boolean;
  venue_type: VenueType;
  area: string;
  primary_area: string;
  major_region: string;
  address: string;
  avg_price_hkd: string;
  signature_dishes: string;
  michelin_url: string;
  lat: number;
  lon: number;
  geo_source: string;
  geocode_success: boolean;
  geocode_query: string;
  geocode_display_name: string;
  fallback_reason: string;
  address_en: string;
}
