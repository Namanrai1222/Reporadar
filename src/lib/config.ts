export type RuntimeMode = "local" | "production";

export interface AppConfig {
  runtimeMode: RuntimeMode;
  appUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  redisRestUrl?: string;
  redisRestToken?: string;
  groqApiKey?: string;
  openRouterApiKey?: string;
  ollamaBaseUrl?: string;
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
    groqApiKey: process.env.GROQ_API_KEY,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
  };
}

export function isSupabaseConfigured(config = getConfig()) {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && config.supabaseServiceRoleKey);
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

