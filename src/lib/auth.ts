import { AppError, getConfig, isSupabaseConfigured } from "./config";

export interface AuthUser {
  id: string;
  email?: string;
  role: "authenticated" | "anonymous";
}

interface SupabaseUserResponse {
  id: string;
  email?: string;
  aud?: string;
}

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    return null;
  }

  const config = getConfig();
  if (!isSupabaseConfigured(config)) {
    return {
      id: "local-authenticated-user",
      role: "authenticated",
    };
  }

  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: config.supabaseAnonKey as string,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError("AUTH_REQUIRED", "Authentication is required.", 401);
  }

  const user = (await response.json()) as SupabaseUserResponse;
  return {
    id: user.id,
    email: user.email,
    role: "authenticated",
  };
}

export async function requireUser(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new AppError("AUTH_REQUIRED", "Authentication is required for persisted scans.", 401);
  }
  return user;
}

