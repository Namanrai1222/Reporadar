'use client';

import { getAccessToken, refreshSession } from './auth-client';

function withAuth(input: string, init: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

/**
 * fetch() wrapper that attaches the Supabase access token as a Bearer header.
 * Every call to a persisted API route (scans, reports, saved-reports) must go
 * through this so the server can identify the user — plain fetch() is anonymous.
 *
 * On a 401 (typically an expired access token) it refreshes the session once
 * via the stored refresh token and retries, so users aren't silently logged out
 * mid-session.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await withAuth(input, init);
  if (res.status !== 401 || !getAccessToken()) return res;
  const refreshed = await refreshSession();
  return refreshed ? withAuth(input, init) : res;
}
