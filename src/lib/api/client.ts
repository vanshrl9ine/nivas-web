import type { ProblemDetail, TokenResponse } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const ACCESS_TOKEN_KEY = "nivas.accessToken";
const REFRESH_TOKEN_KEY = "nivas.refreshToken";

/**
 * An error carrying the API's problem detail.
 *
 * The backend returns a stable `code` on every error specifically so clients do
 * not have to pattern-match on message text, so that is what callers branch on.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: { field: string; message: string }[];
  readonly retryAfterSeconds: number | null;

  constructor(problem: ProblemDetail, retryAfterSeconds: number | null = null) {
    super(problem.detail ?? problem.title ?? "Something went wrong");
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code ?? "unknown";
    this.fieldErrors = problem.errors ?? [];
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isRateLimited() {
    return this.status === 429;
  }

  /** A single sentence suitable for a toast. */
  get userMessage() {
    if (this.isRateLimited && this.retryAfterSeconds) {
      return `Too many requests. Try again in ${this.retryAfterSeconds}s.`;
    }
    if (this.fieldErrors.length > 0) {
      return this.fieldErrors.map((e) => `${e.field}: ${e.message}`).join("; ");
    }
    return this.message;
  }
}

// -- token storage -----------------------------------------------------------
//
// localStorage rather than a cookie because the API is a separate origin and
// authenticates with a bearer header, not a session cookie. The tradeoff is
// real: localStorage is readable by any script on the page, so an XSS becomes a
// token theft. A production deployment should put the API behind the same origin
// and move the refresh token to an httpOnly cookie.

export const tokenStore = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  save(tokens: Pick<TokenResponse, "accessToken" | "refreshToken">) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// -- refresh -----------------------------------------------------------------

/**
 * In-flight refresh, shared across callers.
 *
 * Without this, a page that fires four requests on mount with an expired token
 * would kick off four refreshes. Since the backend *rotates* refresh tokens, the
 * first would succeed and the rest would present an already-revoked token and
 * fail — logging the user out on nothing more than a page load.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    tokenStore.clear();
    return null;
  }

  const tokens = (await response.json()) as TokenResponse;
  tokenStore.save(tokens);
  return tokens.accessToken;
}

function refreshOnce(): Promise<string | null> {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Notifies the auth context when a session ends because a refresh failed. */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler = () => {};

export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  onSessionExpired = handler;
}

// -- request -----------------------------------------------------------------

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the Authorization header even when a token is present. */
  anonymous?: boolean;
  /** Internal: prevents a refresh loop. */
  isRetry?: boolean;
}

async function toApiError(response: Response): Promise<ApiError> {
  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : null;

  let problem: ProblemDetail;
  try {
    problem = (await response.json()) as ProblemDetail;
  } catch {
    // A gateway error or a dropped connection has no JSON body.
    problem = {
      status: response.status,
      title: response.statusText,
      detail:
        response.status === 0 || response.status >= 500
          ? "The server is unreachable. Is the API running on " + API_BASE_URL + "?"
          : response.statusText,
    };
  }
  return new ApiError({ ...problem, status: problem.status || response.status }, retryAfter);
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, anonymous, isRetry, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const accessToken = anonymous ? null : tokenStore.getAccessToken();
  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({
      status: 503,
      title: "Network error",
      detail: `Could not reach the API at ${API_BASE_URL}. Is it running?`,
      code: "network_error",
    });
  }

  // Access tokens live 15 minutes, so a 401 mid-session is routine rather than
  // exceptional. Refresh once and replay; only give up if that also fails.
  if (response.status === 401 && !anonymous && !isRetry && tokenStore.getRefreshToken()) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, isRetry: true });
    }
    onSessionExpired();
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/**
 * Builds a query string from search criteria.
 *
 * Repeats the key for array values (`amenities=PARKING&amenities=LIFT`) because
 * that is what Spring binds a `List<T>` request parameter from. Undefined, null
 * and empty values are dropped so the URL stays legible and shareable.
 */
export function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      value
        .filter((item) => item !== undefined && item !== null && item !== "")
        .forEach((item) => search.append(key, String(item)));
    } else {
      search.append(key, String(value));
    }
  }

  return search.toString();
}
