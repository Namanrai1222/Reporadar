export type RuntimeMode = "local" | "production";

export interface RateLimitConfig {
  /** Scans an unauthenticated visitor may run per calendar day (UTC). */
  anonymousPerDay: number;
  /** Scans a free-tier account may run per calendar day (UTC). */
  freePerDay: number;
  /** Scans a pro-tier account may run per calendar day (UTC). */
  proPerDay: number;
  /** Concurrent in-flight scans allowed per user. */
  maxConcurrentPerUser: number;
}

export interface AppConfig {
  runtimeMode: RuntimeMode;
  appUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  redisRestUrl?: string;
  redisRestToken?: string;
  /** Rotation pool of Groq keys (round-robin on HTTP 429). */
  groqApiKeys: string[];
  /** Rotation pool of OpenRouter keys. */
  openRouterApiKeys: string[];
  ollamaBaseUrl?: string;
  githubToken?: string;
  /** Max concurrent LLM synthesis calls in this process (throttle). */
  llmConcurrency: number;
  rateLimits: RateLimitConfig;
}

/** Split one or more env values (each possibly comma-separated) into a deduped, non-empty key list. */
function parseKeys(...values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const part of value.split(",")) {
      const key = part.trim();
      if (key) seen.add(key);
    }
  }
  return [...seen];
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getConfig(): AppConfig {
  return {
    runtimeMode: process.env.NODE_ENV === "production" ? "production" : "local",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    redisRestUrl: process.env.REDIS_REST_URL,
    redisRestToken: process.env.REDIS_REST_TOKEN,
    groqApiKeys: parseKeys(process.env.GROQ_API_KEY, process.env.GROQ_API_KEYS),
    openRouterApiKeys: parseKeys(process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEYS),
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    githubToken: process.env.GITHUB_TOKEN,
    llmConcurrency: parseIntEnv(process.env.LLM_CONCURRENCY, 4),
    rateLimits: {
      anonymousPerDay: parseIntEnv(process.env.ANONYMOUS_SCANS_PER_DAY, 3),
      freePerDay: parseIntEnv(process.env.FREE_TIER_SCANS_PER_DAY, 5),
      proPerDay: parseIntEnv(process.env.PRO_TIER_SCANS_PER_DAY, 100),
      maxConcurrentPerUser: parseIntEnv(process.env.MAX_CONCURRENT_SCANS_PER_USER, 1),
    },
  };
}

export function isSupabaseConfigured(config = getConfig()) {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && config.supabaseServiceRoleKey);
}

export function isRedisConfigured(config = getConfig()) {
  return Boolean(config.redisRestUrl && config.redisRestToken);
}

export function requireSupabaseConfig(config = getConfig()) {
  if (!isSupabaseConfigured(config)) {
    throw new AppError(
      "SERVER_NOT_CONFIGURED",
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
      503,
    );
  }

  return {
    supabaseUrl: config.supabaseUrl as string,
    supabaseAnonKey: config.supabaseAnonKey as string,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey as string,
  };
}

export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
