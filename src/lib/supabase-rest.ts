import { AppError, requireSupabaseConfig } from "./config";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: string;
  body?: unknown;
  prefer?: string;
}

export class SupabaseRestClient {
  private readonly url: string;
  private readonly serviceRoleKey: string;

  constructor() {
    const config = requireSupabaseConfig();
    this.url = config.supabaseUrl;
    this.serviceRoleKey = config.supabaseServiceRoleKey;
  }

  async table<T>(table: string, options: RequestOptions = {}) {
    const endpoint = new URL(`${this.url}/rest/v1/${table}`);
    if (options.query) {
      endpoint.search = options.query;
    }

    // Legacy service_role keys are JWTs and are read from the Authorization header
    // by PostgREST. The newer `sb_secret_...` keys are opaque (not JWTs) and MUST be
    // sent only via `apikey` — putting them in Authorization makes PostgREST try to
    // parse them as a JWT and reject the request. Detect the format and adapt.
    const isJwtKey = this.serviceRoleKey.startsWith("eyJ");

    const response = await fetch(endpoint, {
      method: options.method ?? "GET",
      headers: {
        apikey: this.serviceRoleKey,
        ...(isJwtKey ? { Authorization: `Bearer ${this.serviceRoleKey}` } : {}),
        "Content-Type": "application/json",
        ...(options.prefer ? { Prefer: options.prefer } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError("DATABASE_ERROR", `Supabase request failed for ${table}: ${text}`, response.status);
    }

    if (response.status === 204) {
      return [] as T[];
    }

    return (await response.json()) as T[];
  }
}
