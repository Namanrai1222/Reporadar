'use client';

import { useEffect } from 'react';
import { captureOAuthRedirect } from '@/lib/auth-client';

/**
 * Mounted once in the root layout. Captures the Supabase OAuth redirect fragment
 * (`#access_token=...`) on whichever page the browser lands on after GitHub
 * sign-in, exchanges it for `HttpOnly` session cookies, and cleans the URL.
 * Renders nothing.
 */
export function SessionBoot() {
  useEffect(() => {
    void captureOAuthRedirect();
  }, []);
  return null;
}
