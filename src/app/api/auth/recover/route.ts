import { AppError, getConfig } from "@/lib/config";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { requestPasswordRecovery } from "@/lib/gotrue";
import { assertSameOrigin } from "@/lib/session";
import { AUTH_RATE_LIMITS, clientFingerprint, consumeFixedWindow } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const { email } = (await request.json().catch(() => ({}))) as { email?: string };
    if (!email || !email.includes("@")) {
      throw new AppError("INVALID_EMAIL", "Enter the email address you signed up with.", 400);
    }

    const byIp = await consumeFixedWindow(
      `auth:recover:ip:${clientFingerprint(request)}`,
      AUTH_RATE_LIMITS.recoverPerIp.limit,
      AUTH_RATE_LIMITS.recoverPerIp.windowSeconds,
    );
    if (!byIp.allowed) {
      throw new AppError("RATE_LIMITED", "Too many reset requests. Please try again later.", 429);
    }

    // Built from config, never from request headers, so a spoofed Host cannot
    // point the emailed link at another site.
    await requestPasswordRecovery(email.trim().toLowerCase(), `${getConfig().appUrl}/reset-password`);

    // Same answer whether or not the account exists.
    return jsonResponse({ sent: true });
  } catch (error) {
    return errorResponse(error);
  }
}
