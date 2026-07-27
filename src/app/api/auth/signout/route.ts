import { errorResponse, jsonResponse } from "@/lib/api-response";
import { revokeSession } from "@/lib/gotrue";
import { assertSameOrigin, clearSessionCookies, readAccessToken } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const accessToken = readAccessToken(request);
    if (accessToken) {
      // Best effort — the cookies are cleared below whether or not GoTrue answers.
      await revokeSession(accessToken);
    }

    return clearSessionCookies(jsonResponse({ authenticated: false }));
  } catch (error) {
    return errorResponse(error);
  }
}
