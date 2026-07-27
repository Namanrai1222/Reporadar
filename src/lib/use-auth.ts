'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSession, signOut as clientSignOut, SESSION_EVENT } from './auth-client';

export interface AuthState {
  /** True once the client has resolved the session (avoids UI flicker/SSR mismatch). */
  ready: boolean;
  authenticated: boolean;
  email?: string;
}

/**
 * Client hook for auth state.
 *
 * The session cookie is `HttpOnly`, so state has to come from the server rather
 * than a synchronous localStorage read. It is re-read when the app signals a
 * change (`SESSION_EVENT`) and when the tab regains focus — the latter replaces
 * the old cross-tab `storage` listener, which no longer fires now that nothing is
 * written to localStorage.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ ready: false, authenticated: false });

  useEffect(() => {
    let active = true;

    const apply = async () => {
      const session = await fetchSession();
      if (!active) return;
      setState({ ready: true, authenticated: session.authenticated, email: session.email });
    };

    void apply();

    const onChange = () => void apply();
    window.addEventListener(SESSION_EVENT, onChange);
    window.addEventListener('focus', onChange);

    return () => {
      active = false;
      window.removeEventListener(SESSION_EVENT, onChange);
      window.removeEventListener('focus', onChange);
    };
  }, []);

  const signOut = useCallback(() => void clientSignOut('/'), []);
  return { ...state, signOut };
}
