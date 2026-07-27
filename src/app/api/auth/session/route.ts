import { AppError } from "@/lib/config";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { getGoTrueUser } from "@/lib/gotrue";
import { getUserFromRequest } from "@/lib/auth";
import { applySessionCookies, assertSameOrigin } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Current session state for the UI.
 *
 * Replaces the old client-side JWT decode: the token is no longer readable by
 * scripts, so "am I signed in?" has to be answered by the server.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    return jsonResponse({ authenticated: Boolean(user), email: user?.email });
  } catch {
    // A rejected or expired token is a normal signed-out state, not a 500.
    return jsonResponse({ authenticated: false });
  }
}

/**
 * Exchange OAuth tokens for session cookies.
 *
 * Supabase's implicit OAuth flow returns tokens in the URL *fragment*, which never
 * reaches the server. The browser reads the fragment and posts it here so the
 * tokens can be re-homed into `HttpOnly` cookies and wiped from the URL.
 *
 * The token is verified against GoTrue before any cookie is set — otherwise this
 * endpoint would be a session-fixation primitive, letting a caller plant an
 * arbitrary attacker-controlled token in someone's browser.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const { access_token, refresh_token, expires_in } = (await request.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!access_token) {
      throw new AppError("INVALID_SESSION", "An access token is required.", 400);
    }

    const user = await getGoTrueUser(access_token);
    if (!user) {
      throw new AppError("INVALID_SESSION", "The supplied token is not valid.", 401);
    }

    return applySessionCookies(jsonResponse({ authenticated: true, email: user.email }), {
      access_token,
      refresh_token,
      expires_in,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
