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
  address_en: string;
  lat: number;
  lon: number;
  price_range: string;
  avg_price?: number | null;
  avg_price_hkd?: string;
  avg_price_cny?: string | null;
  signature_dishes: string | null;
  guide_url: string;
  phone?: string;
  website?: string;
  geo_source: string;
  geocode_success: boolean;
  status: string;
  star_rating?: number;
  edition_year?: number;
  guide_type?: string;
  city?: string;
}
