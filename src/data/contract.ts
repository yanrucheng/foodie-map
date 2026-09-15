import { z } from "zod";

const nonblank = z.string().refine((value) => value.trim().length > 0, "Expected nonempty text");
const optionalText = z.string().nullish();
export const localIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const citySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
export const guideTypeSchema = z.enum(["michelin-starred", "michelin-bib-gourmand"]);
export const servingFormSchema = z.enum(["meal", "snack", "dessert", "drink"]);
export const venueTypeSchema = z.enum(["restaurant", "street_food", "dessert"]);
export const currencySchema = z.enum(["CNY", "HKD", "MOP", "JPY"]);
export const editionYearSchema = z.number().int().min(1000).max(9999);
export const retiredPriceFields = ["avg_price", "avg_price_cny", "avg_price_hkd"] as const;

/** Missing optional text has no display value; otherwise preserve its original wording. */
export function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isSafeHttpUrl(value: string): boolean {
  if (value.trim() !== value || value.includes("\\") || [...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function isGuideUrl(value: string): boolean {
  if (!isSafeHttpUrl(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "guide.michelin.com" && !url.port && /\/restaurant\/[^/]+\/?$/u.test(url.pathname);
}

const positionFields = {
  lat: z.number().finite().min(-90).max(90).nullish(),
  lon: z.number().finite().min(-180).max(180).nullish(),
  geocode_success: z.boolean().nullish(),
};
type Position = { lat?: number | null; lon?: number | null; geocode_success?: boolean | null };

function checkPosition(position: Position, context: z.RefinementCtx): void {
  if ((position.lat == null) !== (position.lon == null)) {
    context.addIssue({ code: "custom", path: ["lat"], message: "Coordinates must be a pair, or both absent" });
  }
  if (position.lat === 0 && position.lon === 0) {
    context.addIssue({ code: "custom", path: ["lat"], message: "0,0 is a placeholder; use null/null for missing coordinates" });
  }
  if (position.geocode_success === true && (position.lat == null || position.lon == null)) {
    context.addIssue({ code: "custom", path: ["geocode_success"], message: "Position is missing despite a successful geocode" });
  }
}

const positionSchema = z.object(positionFields).superRefine(checkPosition);
export const spatialContextSchema = z.object({
  coordinateSystem: z.enum(["WGS84", "unknown"]).optional(),
  bounds: z.tuple([
    z.number().finite().min(-90).max(90), z.number().finite().min(-180).max(180),
    z.number().finite().min(-90).max(90), z.number().finite().min(-180).max(180),
  ]).refine(([south, west, north, east]) => south <= north && west <= east, "Bounds must be ordered south/west/north/east").optional(),
}).strict();
export type SpatialContext = z.infer<typeof spatialContextSchema>;

/** Coordinates follow the existing WGS84 input convention, without per-record certification. */
export function getMapPosition(record: Position, spatialContext?: SpatialContext): [number, number] | null {
  const parsed = positionSchema.safeParse(record);
  const spatial = spatialContextSchema.safeParse(spatialContext ?? {});
  if (!parsed.success || !spatial.success || spatial.data.coordinateSystem === "unknown") return null;
  const { lat, lon, geocode_success } = parsed.data;
  if (lat == null || lon == null || geocode_success === false) return null;
  const bounds = spatial.data.bounds;
  if (bounds && (lat < bounds[0] || lon < bounds[1] || lat > bounds[2] || lon > bounds[3])) return null;
  return [lat, lon];
}

const restaurantObjectSchema = z.object({
  id: localIdSchema,
  name: nonblank,
  city: citySchema,
  guide_type: guideTypeSchema,
  edition_year: editionYearSchema,
  cuisine_group: nonblank,
  name_zh: optionalText,
  name_en: optionalText,
  star_rating: z.number().int().min(0).max(3).nullish(),
  is_new: z.boolean().nullish(),
  cuisine: optionalText,
  venue_type: venueTypeSchema.nullish(),
  serving_form: servingFormSchema.nullish(),
  area: optionalText,
  primary_area: optionalText,
  major_region: optionalText,
  address: optionalText,
  address_en: optionalText,
  ...positionFields,
  geo_source: optionalText,
  guide_url: z.string().refine((url) => !hasText(url) || isGuideUrl(url), "Expected an official HTTPS Michelin restaurant URL").nullish(),
  price: optionalText,
  currency: currencySchema.nullish(),
  price_range: optionalText,
  signature_dishes: optionalText,
  phone: optionalText,
  website: z.string().refine((url) => !hasText(url) || isSafeHttpUrl(url), "Expected a safe HTTP(S) URL").nullish(),
  status: z.enum(["active", "closed", "relocated", "unknown"]).nullish(),
}).passthrough();

export const restaurantFieldNames = new Set(Object.keys(restaurantObjectSchema.shape));
export const restaurantSchema = restaurantObjectSchema.superRefine((record, context) => {
  checkPosition(record, context);
  if (record.star_rating != null && ((record.guide_type === "michelin-starred" && record.star_rating === 0) ||
      (record.guide_type === "michelin-bib-gourmand" && record.star_rating !== 0))) {
    context.addIssue({ code: "custom", path: ["star_rating"], message: "Starred ratings are 1–3; Bib uses 0 (not applicable)" });
  }
  for (const field of retiredPriceFields) {
    if (Object.prototype.hasOwnProperty.call(record, field)) context.addIssue({ code: "custom", path: [field], message: "Retired price field; migrate to price and currency" });
  }
  for (const field of ["color", "icon", "svg"]) {
    if (Object.prototype.hasOwnProperty.call(record, field)) context.addIssue({ code: "custom", path: [field], message: "Presentation is derived from cuisine_group and serving_form; data cannot override it" });
  }
});

export function checkUniqueIds(records: { id: number }[], context: z.RefinementCtx): void {
  const seen = new Set<number>();
  records.forEach((record, index) => {
    if (seen.has(record.id)) context.addIssue({ code: "custom", path: [index, "id"], message: `Duplicate file-local ID ${record.id}` });
    seen.add(record.id);
  });
}

export const restaurantArraySchema = z.array(restaurantSchema).superRefine(checkUniqueIds);
export function parseRestaurantArray(input: unknown): Restaurant[] { return restaurantArraySchema.parse(input); }
export type Restaurant = z.infer<typeof restaurantSchema>;
export type ServingForm = z.infer<typeof servingFormSchema>;
export type VenueType = z.infer<typeof venueTypeSchema>;
