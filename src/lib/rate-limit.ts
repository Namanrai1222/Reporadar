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
    await this.command(`decr/${encodeURIComponent(key)}`);
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
