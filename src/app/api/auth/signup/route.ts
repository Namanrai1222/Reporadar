import { AppError } from "@/lib/config";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { signUpWithPassword } from "@/lib/gotrue";
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

    // Enforce the password policy server-side too — the client-side check in the
    // signup form is a UX affordance, not a control.
    if (password.length < 8) {
      throw new AppError("WEAK_PASSWORD", "Password must be at least 8 characters.", 400);
    }

    const ip = clientFingerprint(request);
    const byIp = await consumeFixedWindow(
      `auth:signup:ip:${ip}`,
      AUTH_RATE_LIMITS.signupPerIp.limit,
      AUTH_RATE_LIMITS.signupPerIp.windowSeconds,
    );

    if (!byIp.allowed) {
      throw new AppError("RATE_LIMITED", "Too many accounts created from this network. Try again later.", 429);
    }

    const session = await signUpWithPassword(email.trim().toLowerCase(), password);

    // When the project requires email confirmation GoTrue returns a user but no
    // tokens. Report that as `pending` rather than pretending the session is live.
    if (!session.access_token) {
      return jsonResponse({ authenticated: false, pendingConfirmation: true });
    }

    return applySessionCookies(
      jsonResponse({ authenticated: true, pendingConfirmation: false, email: session.user?.email }),
      session,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
