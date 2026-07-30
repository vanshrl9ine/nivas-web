/**
 * Wire types, mirrored from the nivas-api DTOs.
 *
 * Hand-written rather than generated. The API publishes an OpenAPI document at
 * /v3/api-docs, so these could be generated — but that couples the frontend build
 * to a running backend, and the surface is small enough that drift is caught the
 * first time a page renders. If this grew, generation would be the right call.
 */

// -- enums (mirror the Java enums exactly; the API sends the constant name) ---

export const ROLES = ["SEEKER", "OWNER", "AGENT", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const LISTING_TYPES = ["SALE", "RENT"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const PROPERTY_TYPES = [
  "APARTMENT",
  "INDEPENDENT_HOUSE",
  "VILLA",
  "PLOT",
  "STUDIO",
  "PENTHOUSE",
  "OFFICE",
  "SHOP",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "SOLD",
  "RENTED",
  "ARCHIVED",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const FURNISHINGS = ["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"] as const;
export type Furnishing = (typeof FURNISHINGS)[number];

export const AMENITIES = [
  "PARKING",
  "LIFT",
  "POWER_BACKUP",
  "SECURITY",
  "GYM",
  "SWIMMING_POOL",
  "CLUBHOUSE",
  "PARK",
  "GAS_PIPELINE",
  "WATER_SUPPLY_24X7",
  "RAIN_WATER_HARVESTING",
  "VASTU_COMPLIANT",
  "PET_FRIENDLY",
  "WHEELCHAIR_ACCESSIBLE",
  "GATED_COMMUNITY",
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const ALERT_FREQUENCIES = ["NONE", "INSTANT", "DAILY", "WEEKLY"] as const;
export type AlertFrequency = (typeof ALERT_FREQUENCIES)[number];

export const SORT_OPTIONS = [
  "RELEVANCE",
  "PRICE_ASC",
  "PRICE_DESC",
  "AREA_DESC",
  "NEWEST",
  "DISTANCE",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

// -- envelopes ---------------------------------------------------------------

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

/**
 * RFC 9457 problem detail, as returned by GlobalExceptionHandler.
 * `code` is the stable machine-readable field; `detail` is for humans.
 */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string;
  timestamp?: string;
  errors?: { field: string; message: string }[];
}

// -- auth --------------------------------------------------------------------

export interface UserResponse {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  createdAt: string | null;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserResponse;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// -- catalog -----------------------------------------------------------------

export interface LocalityResponse {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  /** Centroid, used to centre a map and to prefill a new listing's coordinates. */
  latitude: number | null;
  longitude: number | null;
}

export interface ImageResponse {
  id: string;
  url: string;
  caption: string | null;
  position: number;
  width: number | null;
  height: number | null;
}

export interface OwnerResponse {
  id: string;
  fullName: string | null;
  phone: string | null;
}

export interface PropertyDetailResponse {
  id: string;
  title: string;
  description: string | null;
  listingType: ListingType;
  propertyType: PropertyType;
  status: PropertyStatus;
  price: number;
  pricePerSqft: number | null;
  maintenanceMonthly: number | null;
  securityDeposit: number | null;
  priceNegotiable: boolean;
  availableFrom: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconies: number | null;
  furnishing: Furnishing | null;
  carpetAreaSqft: number | null;
  builtUpAreaSqft: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  ageYears: number | null;
  locality: LocalityResponse | null;
  addressLine: string | null;
  city: string;
  state: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  reraId: string | null;
  verified: boolean;
  viewCount: number;
  amenities: Amenity[];
  images: ImageResponse[];
  owner: OwnerResponse;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OwnerListingResponse {
  id: string;
  title: string;
  status: PropertyStatus;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  city: string;
  viewCount: number;
  imageCount: number;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface ImagePayload {
  url: string;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface UpsertPropertyRequest {
  title: string;
  description?: string | null;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  maintenanceMonthly?: number | null;
  securityDeposit?: number | null;
  priceNegotiable: boolean;
  availableFrom?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  balconies?: number | null;
  furnishing?: Furnishing | null;
  carpetAreaSqft?: number | null;
  builtUpAreaSqft?: number | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  ageYears?: number | null;
  localityId?: string | null;
  addressLine?: string | null;
  city: string;
  state: string;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reraId?: string | null;
  amenities?: Amenity[];
  images?: ImagePayload[];
}

// -- search ------------------------------------------------------------------

export interface PropertySummary {
  id: string;
  title: string;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  pricePerSqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  furnishing: Furnishing | null;
  localityName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean | null;
  imageCount: number | null;
  coverImageUrl: string | null;
  viewCount: number | null;
  publishedAt: string | null;
  /** Only present when the search supplied a point and sorted by distance. */
  distanceKm: number | null;
  score: number | null;
}

export interface FacetBucket {
  key: string;
  label: string;
  count: number;
}

export interface PriceStats {
  min: number | null;
  max: number | null;
  avg: number | null;
}

export interface SearchResponse {
  results: PageResponse<PropertySummary>;
  /** Facet name to buckets, e.g. propertyType -> [APARTMENT (42), VILLA (7)]. */
  facets: Record<string, FacetBucket[]>;
  priceStats: PriceStats | null;
  tookMillis: number;
}

/**
 * Mirrors the backend SearchRequest. Every field is optional because the
 * endpoint binds from query parameters and treats absent as "no constraint".
 */
export interface SearchCriteria {
  q?: string;
  city?: string;
  localitySlugs?: string[];
  listingType?: ListingType;
  propertyTypes?: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number[];
  minAreaSqft?: number;
  maxAreaSqft?: number;
  furnishing?: Furnishing[];
  amenities?: Amenity[];
  verifiedOnly?: boolean;
  publishedAfter?: string;
  lat?: number;
  lon?: number;
  radiusKm?: number;
  topLeftLat?: number;
  topLeftLon?: number;
  bottomRightLat?: number;
  bottomRightLon?: number;
  sort?: SortOption;
  page?: number;
  size?: number;
}

// -- leads -------------------------------------------------------------------

export interface CreateLeadRequest {
  name: string;
  email: string;
  phone: string;
  message?: string | null;
  source?: string | null;
}

export interface LeadAcceptedResponse {
  id: string;
  status: LeadStatus;
  createdAt: string;
}

export interface LeadResponse {
  id: string;
  propertyId: string;
  propertyTitle: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  status: LeadStatus;
  source: string;
  createdAt: string;
}

// -- saved searches ----------------------------------------------------------

export interface SavedSearchResponse {
  id: string;
  name: string;
  criteria: SearchCriteria;
  alertFrequency: AlertFrequency;
  lastAlertedAt: string | null;
  createdAt: string;
  newMatchCount: number;
}

export interface UpsertSavedSearchRequest {
  name: string;
  criteria: SearchCriteria;
  alertFrequency?: AlertFrequency;
}
