'use client';

import { useCallback, useEffect, useState } from 'react';
import { captureOAuthRedirect, getSession, signOut as clientSignOut, TOKEN_KEY } from './auth-client';

export interface AuthState {
  /** True once the client has read the stored session (avoids UI flicker/SSR mismatch). */
  ready: boolean;
  authenticated: boolean;
  email?: string;
}

/**
 * Client hook for auth state. Reads the token stored by auth-client, captures the
 * OAuth redirect hash on first load, and reacts to sign-in/out in other tabs.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ ready: false, authenticated: false });

  useEffect(() => {
    captureOAuthRedirect();
    const apply = () => {
      const session = getSession();
      setState({ ready: true, authenticated: Boolean(session), email: session?.email });
    };
    apply();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === TOKEN_KEY) apply();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const signOut = useCallback(() => clientSignOut('/'), []);
  return { ...state, signOut };
}
