import { createHash } from "crypto";
import { getConfig } from "./config";

export interface CacheAdapter {
  configured: boolean;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

export function createCacheAdapter(): CacheAdapter {
  const config = getConfig();
  if (config.redisRestUrl && config.redisRestToken) {
    return new RedisRestCacheAdapter(config.redisRestUrl, config.redisRestToken);
  }
  return new DisabledCacheAdapter();
}

export function buildReportCacheKey(input: {
  repo: string;
  commitOrBranch: string;
  mode: string;
  model: string;
  scannerVersion: string;
  retrievalVersion: string;
  promptVersion: string;
}) {
  const raw = [
    input.repo,
    input.commitOrBranch,
    input.mode,
    input.model,
    input.scannerVersion,
    input.retrievalVersion,
    input.promptVersion,
  ].join(":");

  return `reporadar:report:${createHash("sha256").update(raw).digest("hex")}`;
}

class RedisRestCacheAdapter implements CacheAdapter {
  configured = true;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async get<T>(key: string) {
    const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: string | null };
    return payload.result ? (JSON.parse(payload.result) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    await fetch(`${this.url}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([JSON.stringify(value), "EX", ttlSeconds]),
      cache: "no-store",
    });
  }
}

class DisabledCacheAdapter implements CacheAdapter {
  configured = false;

  async get() {
    return null;
  }

  async set() {}
}

