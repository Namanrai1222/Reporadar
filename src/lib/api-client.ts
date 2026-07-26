'use client';

import { getAccessToken } from './auth-client';

/**
 * fetch() wrapper that attaches the Supabase access token as a Bearer header.
 * Every call to a persisted API route (scans, reports, saved-reports) must go
 * through this so the server can identify the user — plain fetch() is anonymous.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
