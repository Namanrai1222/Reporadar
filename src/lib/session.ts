import type { NextResponse } from "next/server";
import { AppError, getConfig } from "./config";

/**
 * Cookie-backed sessions.
 *
 * Tokens live in `HttpOnly` cookies set by our own `/api/auth/*` routes, never in
 * `localStorage` — so a script injection cannot read or exfiltrate them. The
 * browser talks only to this origin; Supabase's GoTrue API is reached
 * server-to-server.
 *
 * Because cookies are *ambient* credentials (the browser attaches them to any
 * request to this origin, including ones initiated by another site), this design
 * requires CSRF protection that the previous Bearer-header design did not. Two
 * independent layers provide it:
 *   1. `SameSite=Strict` — the browser omits the cookie on cross-site requests.
 *   2. `assertSameOrigin` — an explicit Origin check on every state-changing route.
 */

export const ACCESS_COOKIE = "rr_session";
export const REFRESH_COOKIE = "rr_refresh";

/** Fallback access-token lifetime when GoTrue omits `expires_in`. */
const DEFAULT_ACCESS_MAX_AGE = 60 * 60;
/** Refresh tokens outlive access tokens so sessions survive a browser restart. */
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export interface SessionTokens {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // `Secure` is required in production but would make the cookie unusable over
    // plain-HTTP localhost during development.
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

/** Attach session cookies to an outgoing response. Returns the same response for chaining. */
export function applySessionCookies(response: NextResponse, tokens: SessionTokens): NextResponse {
  if (tokens.access_token) {
    response.cookies.set(
      ACCESS_COOKIE,
      tokens.access_token,
      cookieOptions(tokens.expires_in ?? DEFAULT_ACCESS_MAX_AGE),
    );
  }
  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(REFRESH_MAX_AGE));
  }
  return response;
}

/** Expire both session cookies. */
export function clearSessionCookies(response: NextResponse): NextResponse {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.set(name, "", cookieOptions(0));
  }
  return response;
}

/**
 * Parse a single cookie out of the request's `Cookie` header.
 *
 * Read from the raw header rather than `NextRequest.cookies` so the helper also
 * works with a plain `Request` — which is what the route handlers and the unit
 * tests actually pass around.
 */
function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

export function readAccessToken(request: Request): string | null {
  return readCookie(request, ACCESS_COOKIE);
}

export function readRefreshToken(request: Request): string | null {
  return readCookie(request, REFRESH_COOKIE);
}

/** Origins this deployment considers its own. */
function allowedOrigins(request: Request): string[] {
  const origins = new Set<string>();

  const add = (value: string | null | undefined) => {
    if (!value) return;
    try {
      origins.add(new URL(value).origin);
    } catch {
      /* ignore malformed values */
    }
  };

  add(getConfig().appUrl);
  add(request.url);

  // Behind a reverse proxy the request URL carries the internal host, so the
  // forwarded host is needed to recognise our own public origin.
  //
  // DEPLOYMENT REQUIREMENT: the proxy must *overwrite* `x-forwarded-host` rather
  // than appending to a client-supplied value. If a caller can set this header
  // freely they can nominate their own origin as trusted and defeat the CSRF check.
  // Vercel, Cloudflare and nginx (`proxy_set_header`) all overwrite by default.
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    add(`${proto}://${forwardedHost}`);
  }

  return [...origins];
}

/**
 * CSRF guard for state-changing requests (POST/PUT/PATCH/DELETE).
 *
 * Fails closed on a missing `Origin`: browsers always send it on cross-origin
 * requests and on same-origin non-GET requests, so its absence means the caller
 * is not a browser form/fetch we are willing to trust with ambient credentials.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");

  if (!origin) {
    throw new AppError(
      "CSRF_BLOCKED",
      "Missing Origin header on a state-changing request.",
      403,
    );
  }

  if (!allowedOrigins(request).includes(origin)) {
    throw new AppError("CSRF_BLOCKED", "Cross-origin state-changing request rejected.", 403);
  }
}
