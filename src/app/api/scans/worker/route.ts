import { timingSafeEqual } from "node:crypto";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { AppError } from "@/lib/config";
import { runQueuedScanJob } from "@/lib/scan-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertWorkerAuthorized(request);
    const result = await runQueuedScanJob();
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

function assertWorkerAuthorized(request: Request) {
  const secret = process.env.SCAN_WORKER_SECRET;
  if (!secret) {
    throw new AppError("SERVER_NOT_CONFIGURED", "SCAN_WORKER_SECRET is not configured.", 503);
  }

  const token = readBearerToken(request);
  if (!token || !safeEqual(token, secret)) {
    throw new AppError("AUTH_REQUIRED", "Worker authorization failed.", 401);
  }
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || request.headers.get("x-worker-token") || "";
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
