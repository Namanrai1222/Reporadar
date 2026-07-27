import { AppError } from "@/lib/config";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { refreshAccessToken, type GoTrueSession } from "@/lib/gotrue";
import { applySessionCookies, assertSameOrigin, clearSessionCookies, readRefreshToken } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exchange the refresh cookie for a new access token so sessions survive expiry. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const refreshToken = readRefreshToken(request);
    if (!refreshToken) {
      // Nothing to refresh — make sure a stale access cookie doesn't linger.
      return clearSessionCookies(jsonResponse({ authenticated: false }, 401));
    }

    let session: GoTrueSession;
    try {
      session = await refreshAccessToken(refreshToken);
    } catch (error) {
      // A rejected refresh token is terminal: drop the cookies so the client stops
      // retrying and the user is cleanly signed out.
      if (error instanceof AppError && error.status === 401) {
        return clearSessionCookies(jsonResponse({ authenticated: false }, 401));
      }
      throw error;
    }

    if (!session.access_token) {
      return clearSessionCookies(jsonResponse({ authenticated: false }, 401));
    }

    return applySessionCookies(jsonResponse({ authenticated: true, email: session.user?.email }), session);
  } catch (error) {
    return errorResponse(error);
  }
}
