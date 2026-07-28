import { AppError, requireSupabaseConfig } from "./config";

/**
 * Server-side client for Supabase's GoTrue auth API.
 *
 * The browser never calls GoTrue directly. It posts credentials to our own
 * `/api/auth/*` routes, which call GoTrue from the server and hand the resulting
 * tokens back as `HttpOnly` cookies. Routing auth through our own origin is what
 * makes those cookies possible, and it also gives us a place to enforce rate
 * limits (a third-party endpoint the browser hits directly cannot be throttled by us).
 */

const TIMEOUT_MS = 15_000;

export interface GoTrueSession {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
}

interface GoTrueErrorBody {
  error_description?: string;
  msg?: string;
  message?: string;
  error?: string;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as GoTrueErrorBody;
    return body.error_description || body.msg || body.message || body.error || fallback;
  } catch {
    return fallback;
  }
}

async function gotrue(path: string, body: Record<string, string>, fallbackError: string): Promise<GoTrueSession> {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new AppError("AUTH_UPSTREAM_TIMEOUT", "The authentication service timed out. Please try again.", 504);
    }
    throw new AppError("AUTH_UPSTREAM_UNREACHABLE", "Could not reach the authentication service.", 502);
  }

  if (!response.ok) {
    // Surface GoTrue's own message (e.g. "Invalid login credentials") but keep the
    // status in the 4xx range the client expects.
    const status = response.status >= 500 ? 502 : 401;
    throw new AppError("AUTH_FAILED", await readError(response, fallbackError), status);
  }

  return (await response.json()) as GoTrueSession;
}

export function signInWithPassword(email: string, password: string) {
  return gotrue(
    "/auth/v1/token?grant_type=password",
    { email, password },
    "Could not sign in. Check your email and password.",
  );
}

export function signUpWithPassword(email: string, password: string) {
  return gotrue("/auth/v1/signup", { email, password }, "Could not create the account.");
}

export function refreshAccessToken(refreshToken: string) {
  return gotrue(
    "/auth/v1/token?grant_type=refresh_token",
    { refresh_token: refreshToken },
    "Session expired. Please sign in again.",
  );
}

/** OAuth providers the app has sign-in buttons for. */
export const SUPPORTED_OAUTH_PROVIDERS = ["github", "google"] as const;
export type OAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

interface ProviderCache {
  value: Record<OAuthProvider, boolean>;
  expiresAt: number;
}
let providerCache: ProviderCache | null = null;
const PROVIDER_CACHE_MS = 60_000;

/**
 * Ask GoTrue which external providers are enabled for this project.
 *
 * `/auth/v1/settings` is an unauthenticated metadata endpoint that reports the
 * project's own configuration — it tells us nothing about users, and it is the
 * only way to know whether `/authorize?provider=x` will succeed before sending
 * the browser there. Cached briefly so rendering an auth page is not gated on a
 * round-trip every time.
 *
 * Fails *open* deliberately: if the lookup itself fails we report every provider
 * as available rather than hiding working buttons over a transient blip. The
 * worst case is the pre-existing behaviour, and the click path still surfaces a
 * readable error.
 */
export async function getEnabledOAuthProviders(): Promise<Record<OAuthProvider, boolean>> {
  const now = Date.now();
  if (providerCache && providerCache.expiresAt > now) return providerCache.value;

  const allEnabled = Object.fromEntries(SUPPORTED_OAUTH_PROVIDERS.map((p) => [p, true])) as Record<
    OAuthProvider,
    boolean
  >;

  let value: Record<OAuthProvider, boolean>;
  try {
    const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return allEnabled;

    const body = (await response.json()) as { external?: Record<string, boolean> };
    const external = body.external ?? {};
    value = Object.fromEntries(
      SUPPORTED_OAUTH_PROVIDERS.map((p) => [p, external[p] === true]),
    ) as Record<OAuthProvider, boolean>;
  } catch {
    return allEnabled;
  }

  providerCache = { value, expiresAt: now + PROVIDER_CACHE_MS };
  return value;
}

/** Verify an access token and return its user, or null when the token is invalid/expired. */
export async function getGoTrueUser(accessToken: string): Promise<{ id: string; email?: string } | null> {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: supabaseAnonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AppError("AUTH_UPSTREAM_UNREACHABLE", "Could not reach the authentication service.", 502);
  }

  if (!response.ok) return null;
  return (await response.json()) as { id: string; email?: string };
}

/** Best-effort GoTrue-side session revocation. Cookie clearing is what actually ends our session. */
export async function revokeSession(accessToken: string): Promise<void> {
  try {
    const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: supabaseAnonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    /* the cookies are cleared regardless */
  }
}
