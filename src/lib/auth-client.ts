'use client';

/**
 * Browser-side auth against Supabase's GoTrue REST API.
 * The access token is kept in localStorage and sent as a Bearer
 * header by API callers (see `getAccessToken`), matching the
 * server-side verification in `src/lib/auth.ts`.
 */

const TOKEN_KEY = 'reporadar.access_token';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

function storeToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

interface GoTrueError {
  error_description?: string;
  msg?: string;
  message?: string;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as GoTrueError;
    return body.error_description || body.msg || body.message || fallback;
  } catch {
    return fallback;
  }
}

async function authRequest(path: string, body: Record<string, string>, fallbackError: string) {
  if (!isAuthConfigured()) {
    throw new Error(
      'Authentication is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.',
    );
  }

  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await readError(res, fallbackError));
  return (await res.json()) as { access_token?: string };
}

export async function signIn(email: string, password: string): Promise<void> {
  const data = await authRequest(
    '/auth/v1/token?grant_type=password',
    { email, password },
    'Could not sign in. Check your email and password.',
  );
  if (data.access_token) storeToken(data.access_token);
}

/** Returns true when the account is active immediately, false when email confirmation is pending. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const data = await authRequest('/auth/v1/signup', { email, password }, 'Could not create the account.');
  if (data.access_token) {
    storeToken(data.access_token);
    return true;
  }
  return false;
}

/** Redirects the browser to the GitHub OAuth consent screen. */
export function signInWithGitHub(redirectPath = '/dashboard'): void {
  if (!isAuthConfigured()) {
    throw new Error('Authentication is not configured.');
  }
  const redirectTo = `${window.location.origin}${redirectPath}`;
  window.location.href =
    `${SUPABASE_URL}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectTo)}`;
}
