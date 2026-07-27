import { createHmac } from "node:crypto";
import { getConfig, isRedisConfigured } from "./config";

/**
 * Rate limiting for scans.
 *
 * Two independent guards:
 *   - a per-day counter (anonymous visitors and authenticated users by plan tier)
 *   - a per-user concurrency guard (in-flight scans)
 *
 * Backed by Redis REST (Upstash-compatible) when configured so limits hold
 * across serverless instances; falls back to an in-process Map for local dev
 * (single-instance only — documented as such).
 */

export interface RateDecision {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  /** ISO timestamp when the window resets. */
  resetAt: string;
  scope: string;
}

interface RateStore {
  readonly distributed: boolean;
  increment(key: string, ttlSeconds: number): Promise<number>;
  decrement(key: string): Promise<void>;
}

/** In-memory counter with per-key expiry. Single-instance only. */
class MemoryRateStore implements RateStore {
  readonly distributed = false;
  private readonly map = new Map<string, { count: number; expiresAt: number }>();

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const now = Date.now();
    // Sweep expired keys so a long-lived process without Redis can't grow the
    // map without bound (daily keys and per-IP fingerprints are never reused).
    if (this.map.size > 1000) {
      for (const [k, v] of this.map) if (v.expiresAt <= now) this.map.delete(k);
    }
    const entry = this.map.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.map.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }

  async decrement(key: string): Promise<void> {
    const entry = this.map.get(key);
    if (!entry) return;
    entry.count = Math.max(0, entry.count - 1);
  }
}

/** Upstash Redis REST counter. INCR then EXPIRE on first write. */
class RedisRateStore implements RateStore {
  readonly distributed = true;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(path: string): Promise<{ result?: number | string | null }> {
    const response = await fetch(`${this.url}/${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Redis command failed: ${path}`);
    return (await response.json()) as { result?: number | string | null };
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const encoded = encodeURIComponent(key);
    const { result } = await this.command(`incr/${encoded}`);
    const count = typeof result === "number" ? result : Number(result ?? 0);
    if (count === 1) {
      // Only set TTL when the key was just created, so the window is stable.
      await this.command(`expire/${encoded}/${ttlSeconds}`);
    }
    return count;
  }

  async decrement(key: string): Promise<void> {
    const encoded = encodeURIComponent(key);
    const { result } = await this.command(`decr/${encoded}`);
    const value = typeof result === "number" ? result : Number(result ?? 0);
    // A DECR on an expired/missing key resurrects it at -1 with no TTL, which
    // would permanently offset the concurrency guard. Drop it so the counter
    // re-derives from zero on the next increment (which re-sets the TTL).
    if (value < 0) await this.command(`del/${encoded}`);
  }
}

let cachedStore: RateStore | null = null;

function getStore(): RateStore {
  if (cachedStore) return cachedStore;
  const config = getConfig();
  cachedStore =
    isRedisConfigured(config) && config.redisRestUrl && config.redisRestToken
      ? new RedisRateStore(config.redisRestUrl, config.redisRestToken)
      : new MemoryRateStore();
  return cachedStore;
}

/** Reset internal store — test hook only. */
export function __resetRateStore(): void {
  cachedStore = null;
}

function utcDayStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function nextUtcMidnightIso(date = new Date()): string {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0));
  return next.toISOString();
}

const DAY_TTL_SECONDS = 60 * 60 * 26; // a little over 24h so a stamped key always outlives its day

/**
 * Consume one unit of a subject's daily scan budget.
 * `subject` is a stable identifier (user id, or an anonymous fingerprint such as a hashed IP).
 */
export async function consumeDailyScan(
  subject: string,
  kind: "anonymous" | "user",
  limit: number,
): Promise<RateDecision> {
  const scope = `${kind}:${subject}`;
  const key = `rl:day:${scope}:${utcDayStamp()}`;
  const used = await getStore().increment(key, DAY_TTL_SECONDS);
  const allowed = used <= limit;
  return {
    allowed,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt: nextUtcMidnightIso(),
    scope,
  };
}

/**
 * Consume one unit of a generic fixed-window budget.
 *
 * Used for brute-force protection on the auth routes, where the window is minutes
 * rather than a calendar day. The window is keyed by `floor(now / window)` so the
 * counter rolls over on its own without needing a scheduled reset.
 */
export async function consumeFixedWindow(
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<RateDecision> {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `rl:win:${scope}:${bucket}`;
  const used = await getStore().increment(key, windowSeconds);
  return {
    allowed: used <= limit,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt: new Date((bucket + 1) * windowSeconds * 1000).toISOString(),
    scope,
  };
}

/** Brute-force budgets for the auth routes. */
export const AUTH_RATE_LIMITS = {
  /** Attempts from one IP across all accounts — blunts credential stuffing. */
  perIp: { limit: 20, windowSeconds: 15 * 60 },
  /** Attempts against one account from anywhere — blunts targeted brute force. */
  perAccount: { limit: 8, windowSeconds: 15 * 60 },
  /** Account creation from one IP — blunts automated signup abuse. */
  signupPerIp: { limit: 5, windowSeconds: 60 * 60 },
} as const;

const CONCURRENCY_TTL_SECONDS = 60 * 10; // safety valve: stuck jobs self-release after 10 min

export interface ConcurrencySlot {
  allowed: boolean;
  active: number;
  limit: number;
  release: () => Promise<void>;
}

/** Reserve a concurrency slot for a user's in-flight scan. Always call `release()` when done. */
export async function beginConcurrentJob(userId: string, limit: number): Promise<ConcurrencySlot> {
  const store = getStore();
  const key = `rl:conc:${userId}`;
  const active = await store.increment(key, CONCURRENCY_TTL_SECONDS);
  let released = false;
  const release = async () => {
    if (released) return;
    released = true;
    await store.decrement(key);
  };

  if (active > limit) {
    await release();
    return { allowed: false, active, limit, release: async () => {} };
  }
  return { allowed: true, active, limit, release };
}

/**
 * Stable, non-identifying per-visitor key derived from the client IP.
 *
 * Keyed with a server-side secret because an unsalted digest of an IP is only a
 * pseudonym — the IPv4 space is small enough to exhaustively reverse.
 */
export function clientFingerprint(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "reporadar-local";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

/** Per-plan daily allowance. */
export function dailyLimitForPlan(plan: string | null | undefined): number {
  const { rateLimits } = getConfig();
  switch (plan) {
    case "pro":
    case "team":
    case "enterprise":
      return rateLimits.proPerDay;
    default:
      return rateLimits.freePerDay;
  }
}
