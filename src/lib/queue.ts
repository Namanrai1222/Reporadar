import { randomUUID } from "crypto";
import type { ScanRequest } from "./types";
import { getConfig } from "./config";

export interface QueueJob {
  id: string;
  scanId?: string;
  traceId: string;
  payload: ScanRequest;
}

export interface QueueAdapter {
  configured: boolean;
  enqueue(job: QueueJob): Promise<{ provider: string; jobId: string }>;
}

export function createQueueAdapter(): QueueAdapter {
  const config = getConfig();

  if (config.redisRestUrl && config.redisRestToken) {
    return new RedisQueueAdapter(config.redisRestUrl, config.redisRestToken);
  }

  return new InlineDevelopmentQueueAdapter();
}

export function createQueueJob(payload: ScanRequest, traceId: string, scanId?: string): QueueJob {
  return {
    id: randomUUID(),
    scanId,
    traceId,
    payload,
  };
}

class RedisQueueAdapter implements QueueAdapter {
  configured = true;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async enqueue(job: QueueJob) {
    await fetch(`${this.url}/lpush/${encodeURIComponent("reporadar:scan-jobs")}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([JSON.stringify(job)]),
      cache: "no-store",
    });

    return { provider: "redis-rest", jobId: job.id };
  }
}

class InlineDevelopmentQueueAdapter implements QueueAdapter {
  configured = false;

  async enqueue(job: QueueJob) {
    return { provider: "inline-development", jobId: job.id };
  }
}

