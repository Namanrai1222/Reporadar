'use client';

import { refreshSession } from './auth-client';

/**
 * fetch() wrapper for the app's own API routes.
 *
 * The session travels as an `HttpOnly` cookie, so there is no token to attach —
 * the browser sends it automatically on same-origin requests. `credentials` is set
 * explicitly rather than relying on the default so the intent survives refactors.
 *
 * On a 401 (typically an expired access token) it refreshes the session once via
 * the refresh cookie and retries, so users aren't silently logged out mid-session.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const request = () => fetch(input, { ...init, credentials: 'same-origin' });

  const res = await request();
  if (res.status !== 401) return res;

  const refreshed = await refreshSession();
  return refreshed ? request() : res;
}
