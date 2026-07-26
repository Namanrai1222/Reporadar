import { jsonResponse } from "@/lib/api-response";
import { getConfig, isSupabaseConfigured, isRedisConfigured } from "@/lib/config";
import { preferredProvider } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();

  return jsonResponse({
    ok: true,
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
