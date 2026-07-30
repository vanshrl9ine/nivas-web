import type {
  Amenity,
  Furnishing,
  ListingType,
  PropertyType,
  SearchCriteria,
  SortOption,
} from "@/lib/api/types";
import {
  AMENITIES,
  FURNISHINGS,
  LISTING_TYPES,
  PROPERTY_TYPES,
  SORT_OPTIONS,
} from "@/lib/api/types";

/**
 * Search criteria live in the URL, not in component state.
 *
 * That is the whole reason this module exists: a search someone can copy, paste,
 * bookmark and share is a different product from one that resets on reload. It
 * also means the browser back button steps through refinements, which is what
 * users expect from a filter panel.
 */

function one(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value === null || value === "" ? undefined : value;
}

function num(params: URLSearchParams, key: string): number | undefined {
  const raw = one(params, key);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  // A hand-edited URL is untrusted input; a bad number is dropped rather than
  // sent on to the API as NaN.
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Keeps only values the API actually accepts, so a tampered URL cannot 400. */
function enums<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] | undefined {
  const values = params.getAll(key).filter((value): value is T => (allowed as readonly string[]).includes(value));
  return values.length > 0 ? values : undefined;
}

function singleEnum<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = one(params, key);
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function criteriaFromSearchParams(params: URLSearchParams): SearchCriteria {
  const bedrooms = params
    .getAll("bedrooms")
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 20);

  const localitySlugs = params.getAll("localitySlugs").filter(Boolean);

  return {
    q: one(params, "q"),
    city: one(params, "city"),
    localitySlugs: localitySlugs.length > 0 ? localitySlugs : undefined,
    listingType: singleEnum<ListingType>(params, "listingType", LISTING_TYPES),
    propertyTypes: enums<PropertyType>(params, "propertyTypes", PROPERTY_TYPES),
    minPrice: num(params, "minPrice"),
    maxPrice: num(params, "maxPrice"),
    bedrooms: bedrooms.length > 0 ? bedrooms : undefined,
    minAreaSqft: num(params, "minAreaSqft"),
    maxAreaSqft: num(params, "maxAreaSqft"),
    furnishing: enums<Furnishing>(params, "furnishing", FURNISHINGS),
    amenities: enums<Amenity>(params, "amenities", AMENITIES),
    verifiedOnly: one(params, "verifiedOnly") === "true" ? true : undefined,
    lat: num(params, "lat"),
    lon: num(params, "lon"),
    radiusKm: num(params, "radiusKm"),
    sort: singleEnum<SortOption>(params, "sort", SORT_OPTIONS),
    page: num(params, "page"),
    size: num(params, "size"),
  };
}

/**
 * Serialises criteria back to a query string.
 *
 * Keys are emitted in a fixed order so that two identical searches produce
 * byte-identical URLs — otherwise the same search looks different in history,
 * and any future response caching keyed on the URL would miss.
 */
const KEY_ORDER: (keyof SearchCriteria)[] = [
  "q",
  "city",
  "localitySlugs",
  "listingType",
  "propertyTypes",
  "minPrice",
  "maxPrice",
  "bedrooms",
  "minAreaSqft",
  "maxAreaSqft",
  "furnishing",
  "amenities",
  "verifiedOnly",
  "lat",
  "lon",
  "radiusKm",
  "sort",
  "page",
  "size",
];

export function criteriaToSearchParams(criteria: SearchCriteria): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of KEY_ORDER) {
    const value = criteria[key];
    if (value === undefined || value === null || value === "" || value === false) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // Repeat the key per value — that is what Spring binds a List<T> from.
      value.forEach((item) => params.append(key, String(item)));
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}

/** True when nothing but paging and sorting is set. */
export function hasActiveFilters(criteria: SearchCriteria): boolean {
  return KEY_ORDER.some((key) => {
    if (key === "page" || key === "size" || key === "sort") return false;
    const value = criteria[key];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "";
  });
}

export function countActiveFilters(criteria: SearchCriteria): number {
  let count = 0;
  for (const key of KEY_ORDER) {
    if (key === "page" || key === "size" || key === "sort" || key === "q") continue;
    const value = criteria[key];
    if (Array.isArray(value)) count += value.length;
    else if (value !== undefined && value !== "" && value !== false) count += 1;
  }
  return count;
}

export const SORT_LABELS: Record<SortOption, string> = {
  RELEVANCE: "Most relevant",
  NEWEST: "Newest first",
  PRICE_ASC: "Price: low to high",
  PRICE_DESC: "Price: high to low",
  AREA_DESC: "Largest first",
  DISTANCE: "Nearest first",
};
