import { AppError, getConfig, isSupabaseConfigured } from "./config";
import { getGoTrueUser } from "./gotrue";
import { readAccessToken } from "./session";

export interface AuthUser {
  id: string;
  email?: string;
  role: "authenticated" | "anonymous";
}

/**
 * Resolve the caller from their session cookie.
 *
 * Returns `null` for an absent *or rejected* token: "not signed in" is a normal
 * state, and treating an expired token as a hard error made every route 500 at the
 * end of a session instead of prompting a refresh. Callers that require a user
 * should use `requireUser`.
 *
 * The token is verified against GoTrue rather than merely decoded, so a forged or
 * tampered JWT cannot impersonate a user.
 */
export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const token = readAccessToken(request);

  if (!token) {
    return null;
  }

  const config = getConfig();
  if (!isSupabaseConfigured(config)) {
    // Local/demo mode: there is no auth backend to verify against.
    return {
      id: "local-authenticated-user",
      role: "authenticated",
    };
  }

  const user = await getGoTrueUser(token);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: "authenticated",
  };
}

export async function requireUser(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new AppError("AUTH_REQUIRED", "Authentication is required.", 401);
  }
  return user;
}
