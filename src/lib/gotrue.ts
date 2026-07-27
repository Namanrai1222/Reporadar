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
