import { timingSafeEqual } from "node:crypto";
import { jsonResponse } from "@/lib/api-response";
import { getConfig, isSupabaseConfigured, isRedisConfigured } from "@/lib/config";
import { preferredProvider } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness probe.
 *
 * The public response is deliberately contentless. The detailed view names the
 * backing services, how many provider keys are loaded, and the exact rate-limit
 * thresholds — which together tell an anonymous caller what to target and how to
 * stay under the limits. That view now requires `HEALTH_CHECK_TOKEN`.
 */
function authorized(request: Request): boolean {
  const expected = process.env.HEALTH_CHECK_TOKEN;
  // No token configured = no way to authorise = detail is never served.
  if (!expected) return false;

  const supplied = request.headers.get("x-health-token");
  if (!supplied) return false;

  // Compare in constant time so the token can't be recovered byte-by-byte.
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return jsonResponse({ status: "ok" });
  }

  const config = getConfig();
  return jsonResponse({
    status: "ok",
    service: "reporadar",
    checks: {
      supabase: isSupabaseConfigured(config),
      redis: isRedisConfigured(config),
      llmProvider: preferredProvider().name,
      groqKeys: config.groqApiKeys.length,
      openRouterKeys: config.openRouterApiKeys.length,
      rateLimits: config.rateLimits,
    },
  });
}
