import { randomUUID } from "crypto";

export interface TraceContext {
  traceId: string;
  startedAt: number;
  userId?: string;
  scanId?: string;
}

export interface TelemetryEvent {
  traceId: string;
  event: string;
  scanId?: string;
  userId?: string;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export function createTrace(userId?: string): TraceContext {
  return {
    traceId: randomUUID(),
    startedAt: Date.now(),
    userId,
  };
}

export function emitTelemetry(context: TraceContext, event: string, metadata?: TelemetryEvent["metadata"]) {
  const payload: TelemetryEvent = {
    traceId: context.traceId,
    event,
    scanId: context.scanId,
    userId: context.userId,
    durationMs: Date.now() - context.startedAt,
    metadata,
  };

  console.info(JSON.stringify({ level: "info", source: "reporadar", ...payload }));
}

