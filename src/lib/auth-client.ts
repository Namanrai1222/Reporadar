'use client';

/**
 * Browser-side auth.
 *
 * The browser holds no tokens. Credentials are posted to our own `/api/auth/*`
 * routes, which talk to Supabase server-side and return the session as `HttpOnly`
 * cookies — unreadable by script, so an injected script cannot steal a session.
 *
 * Consequently there is no synchronous "am I signed in?" check any more: session
 * state comes from `fetchSession()`.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Fired whenever the session may have changed, so `useAuth` can re-read it. */
export const SESSION_EVENT = 'reporadar:session';

export function notifySessionChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EVENT));
}

export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export interface SessionState {
  authenticated: boolean;
  email?: string;
}

interface ApiError {
  error?: string;
  code?: string;
}

async function postAuth<T>(path: string, body?: unknown, fallbackError = 'Request failed.'): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Same-origin now, so this only fires when the app itself is unreachable.
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) throw new Error(data.error || fallbackError);
  return data;
}

export async function signIn(email: string, password: string): Promise<void> {
  await postAuth('/api/auth/signin', { email, password }, 'Could not sign in. Check your email and password.');
  notifySessionChange();
}

/** Returns true when the account is active immediately, false when email confirmation is pending. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const data = await postAuth<{ authenticated?: boolean }>(
    '/api/auth/signup',
    { email, password },
    'Could not create the account.',
  );
  notifySessionChange();
  return Boolean(data.authenticated);
}

/** Read the current session from the server. */
export async function fetchSession(): Promise<SessionState> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) return { authenticated: false };
    return (await res.json()) as SessionState;
  } catch {
    return { authenticated: false };
  }
}

/** Exchange the refresh cookie for a new access token. Returns false when the session is over. */
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
    return res.ok;
  } catch {
    return false;
  }
}

export type OAuthProvider = 'github' | 'google';

/**
 * Redirect the browser to a provider's OAuth consent screen via Supabase GoTrue.
 * On return, `captureOAuthRedirect()` re-homes the fragment tokens into cookies —
 * so the flow is identical for every provider.
 *
 * Note: each provider must also be enabled in the Supabase project's Auth settings
 * (client id/secret configured there); this only starts the handshake.
 */
function startOAuth(provider: OAuthProvider, redirectPath: string): void {
  if (!isAuthConfigured()) {
    throw new Error('Authentication is not configured.');
  }
  const redirectTo = `${window.location.origin}${redirectPath}`;
  window.location.href =
    `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

/** Redirects the browser to the GitHub OAuth consent screen. */
export function signInWithGitHub(redirectPath = '/dashboard'): void {
  startOAuth('github', redirectPath);
}

/** Redirects the browser to the Google OAuth consent screen. */
export function signInWithGoogle(redirectPath = '/dashboard'): void {
  startOAuth('google', redirectPath);
}

/**
 * Capture a Supabase OAuth redirect.
 *
 * After GitHub sign-in the browser lands on `<redirect>#access_token=...`. The
 * fragment never reaches the server, so it is posted to `/api/auth/session`, which
 * verifies it and re-homes it into `HttpOnly` cookies. The fragment is then wiped
 * from the URL so the token does not linger in browser history.
 *
 * Returns true when a session was established.
 */
export async function captureOAuthRedirect(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return false;

  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  if (!access_token) return false;

  // Strip the fragment first, so the token leaves the address bar even if the
  // exchange below fails.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  const expires = Number(params.get('expires_in'));
  try {
    await postAuth('/api/auth/session', {
      access_token,
      refresh_token: params.get('refresh_token') ?? undefined,
      expires_in: Number.isFinite(expires) && expires > 0 ? expires : undefined,
    });
    notifySessionChange();
    return true;
  } catch {
    return false;
  }
}

/** Clear the session server-side, then redirect. */
export async function signOut(redirectTo = '/'): Promise<void> {
  try {
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    /* fall through to the redirect regardless */
  }
  notifySessionChange();
  if (typeof window !== 'undefined') window.location.href = redirectTo;
}
