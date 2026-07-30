import { apiFetch, toQueryString } from "./client";
import type {
  CreateLeadRequest,
  LeadAcceptedResponse,
  LeadResponse,
  LeadStatus,
  LocalityResponse,
  OwnerListingResponse,
  PageResponse,
  PropertyDetailResponse,
  PropertyStatus,
  RegisterRequest,
  SavedSearchResponse,
  SearchCriteria,
  SearchResponse,
  TokenResponse,
  UpsertPropertyRequest,
  UpsertSavedSearchRequest,
  UserResponse,
} from "./types";

/** One function per endpoint, so no component ever builds a URL by hand. */

export const authApi = {
  register: (body: RegisterRequest) =>
    apiFetch<TokenResponse>("/api/v1/auth/register", { method: "POST", body, anonymous: true }),

  login: (email: string, password: string) =>
    apiFetch<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
      anonymous: true,
    }),

  me: () => apiFetch<UserResponse>("/api/v1/auth/me"),

  logout: (refreshToken: string) =>
    apiFetch<void>("/api/v1/auth/logout", {
      method: "POST",
      body: { refreshToken },
      anonymous: true,
    }),

  logoutEverywhere: () => apiFetch<void>("/api/v1/auth/logout-all", { method: "POST" }),
};

export const searchApi = {
  search: (criteria: SearchCriteria) =>
    apiFetch<SearchResponse>(`/api/v1/search?${toQueryString({ ...criteria })}`, {
      // Search is public. Sending a token anyway would mean a stale one triggers
      // a pointless refresh on a page that never needed authentication.
      anonymous: true,
    }),
};

export const propertyApi = {
  get: (id: string) => apiFetch<PropertyDetailResponse>(`/api/v1/properties/${id}`, { anonymous: true }),

  getForOwner: (id: string) => apiFetch<PropertyDetailResponse>(`/api/v1/properties/${id}/manage`),

  listMine: (status?: PropertyStatus, page = 0, size = 20) =>
    apiFetch<PageResponse<OwnerListingResponse>>(
      `/api/v1/properties/mine?${toQueryString({ status, page, size })}`,
    ),

  create: (body: UpsertPropertyRequest) =>
    apiFetch<PropertyDetailResponse>("/api/v1/properties", { method: "POST", body }),

  update: (id: string, body: UpsertPropertyRequest) =>
    apiFetch<PropertyDetailResponse>(`/api/v1/properties/${id}`, { method: "PUT", body }),

  changeStatus: (id: string, status: PropertyStatus) =>
    apiFetch<PropertyDetailResponse>(`/api/v1/properties/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  archive: (id: string) => apiFetch<void>(`/api/v1/properties/${id}`, { method: "DELETE" }),
};

export const localityApi = {
  cities: () => apiFetch<string[]>("/api/v1/localities/cities", { anonymous: true }),

  byCity: (city: string) =>
    apiFetch<LocalityResponse[]>(`/api/v1/localities?${toQueryString({ city })}`, {
      anonymous: true,
    }),

  suggest: (q: string, city?: string) =>
    apiFetch<LocalityResponse[]>(`/api/v1/localities/suggest?${toQueryString({ q, city })}`, {
      anonymous: true,
    }),
};

export const leadApi = {
  /**
   * The idempotency key makes a double-submitted enquiry safe. It is generated
   * per form instance, not per click, so a second click of the same form reuses
   * it and the backend returns the original lead.
   */
  create: (propertyId: string, body: CreateLeadRequest, idempotencyKey: string) =>
    apiFetch<LeadAcceptedResponse>(`/api/v1/properties/${propertyId}/leads`, {
      method: "POST",
      body,
      headers: { "Idempotency-Key": idempotencyKey },
    }),

  inbox: (page = 0, size = 20) =>
    apiFetch<PageResponse<LeadResponse>>(`/api/v1/leads?${toQueryString({ page, size })}`),

  forProperty: (propertyId: string, page = 0, size = 20) =>
    apiFetch<PageResponse<LeadResponse>>(
      `/api/v1/properties/${propertyId}/leads?${toQueryString({ page, size })}`,
    ),

  updateStatus: (leadId: string, status: LeadStatus) =>
    apiFetch<LeadResponse>(`/api/v1/leads/${leadId}`, { method: "PATCH", body: { status } }),
};

export const savedSearchApi = {
  list: () => apiFetch<SavedSearchResponse[]>("/api/v1/saved-searches"),

  create: (body: UpsertSavedSearchRequest) =>
    apiFetch<SavedSearchResponse>("/api/v1/saved-searches", { method: "POST", body }),

  update: (id: string, body: UpsertSavedSearchRequest) =>
    apiFetch<SavedSearchResponse>(`/api/v1/saved-searches/${id}`, { method: "PUT", body }),

  run: (id: string) => apiFetch<SearchResponse>(`/api/v1/saved-searches/${id}/results`),

  remove: (id: string) => apiFetch<void>(`/api/v1/saved-searches/${id}`, { method: "DELETE" }),
};
