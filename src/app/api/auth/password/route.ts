import { AppError } from "@/lib/config";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { updatePassword } from "@/lib/gotrue";
import { assertSameOrigin, readAccessToken } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Set a new password. The session comes from the recovery link, captured into cookies by SessionBoot. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const accessToken = readAccessToken(request);
    if (!accessToken) {
      throw new AppError("AUTH_REQUIRED", "This reset link has expired. Request a new one.", 401);
    }

    const { password } = (await request.json().catch(() => ({}))) as { password?: string };
    if (!password || password.length < 8) {
      throw new AppError("WEAK_PASSWORD", "Password must be at least 8 characters.", 400);
    }

    await updatePassword(accessToken, password);
    return jsonResponse({ updated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
