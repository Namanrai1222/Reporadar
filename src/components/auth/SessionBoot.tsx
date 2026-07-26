'use client';

import { useEffect } from 'react';
import { captureOAuthRedirect } from '@/lib/auth-client';

/**
 * Mounted once in the root layout. Captures the Supabase OAuth redirect hash
 * (`#access_token=...`) on any page the browser lands on after GitHub sign-in,
 * stores the token, and cleans the URL. Renders nothing.
 */
export function SessionBoot() {
  useEffect(() => {
    captureOAuthRedirect();
  }, []);
  return null;
}
