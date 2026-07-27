import { AppError } from "@/lib/config";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { signInWithPassword } from "@/lib/gotrue";
import { applySessionCookies, assertSameOrigin } from "@/lib/session";
import { AUTH_RATE_LIMITS, clientFingerprint, consumeFixedWindow } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const { email, password } = (await request.json()) as { email?: string; password?: string };
    if (!email || !password) {
      throw new AppError("INVALID_CREDENTIALS", "Email and password are required.", 400);
    }

    // Two independent brute-force budgets: one per source IP (credential stuffing
    // across many accounts) and one per account (targeted guessing from many IPs).
    const normalizedEmail = email.trim().toLowerCase();
    const ip = clientFingerprint(request);

    const byIp = await consumeFixedWindow(
      `auth:signin:ip:${ip}`,
      AUTH_RATE_LIMITS.perIp.limit,
      AUTH_RATE_LIMITS.perIp.windowSeconds,
    );
    const byAccount = await consumeFixedWindow(
      `auth:signin:account:${normalizedEmail}`,
      AUTH_RATE_LIMITS.perAccount.limit,
      AUTH_RATE_LIMITS.perAccount.windowSeconds,
    );

    if (!byIp.allowed || !byAccount.allowed) {
      // Deliberately identical regardless of which budget tripped, so the response
      // cannot be used to probe whether an account exists or is under attack.
      throw new AppError(
        "RATE_LIMITED",
        "Too many sign-in attempts. Please wait a few minutes and try again.",
        429,
      );
    }

    const session = await signInWithPassword(normalizedEmail, password);
    if (!session.access_token) {
      throw new AppError("AUTH_FAILED", "Could not sign in. Check your email and password.", 401);
    }

    return applySessionCookies(
      jsonResponse({ authenticated: true, email: session.user?.email ?? normalizedEmail }),
      session,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
