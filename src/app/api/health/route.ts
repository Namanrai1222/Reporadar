import { jsonResponse } from "@/lib/api-response";
import { getConfig, isSupabaseConfigured } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();

  return jsonResponse({
    ok: true,
    service: "reporadar",
    checks: {
      supabase: isSupabaseConfigured(config),
      redisQueue: Boolean(config.redisRestUrl && config.redisRestToken),
      llmProvider: config.groqApiKey ? "groq" : config.openRouterApiKey ? "openrouter" : config.ollamaBaseUrl ? "ollama" : "mock",
    },
  });
}

