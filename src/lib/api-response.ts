import { NextResponse } from "next/server";
import { AppError } from "./config";
import { securityHeaders } from "./security";

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: securityHeaders(),
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return jsonResponse(
      {
        error: error.message,
        code: error.code,
      },
      error.status,
    );
  }

  return jsonResponse(
    {
      error: error instanceof Error ? error.message : "Unexpected server error.",
      code: "INTERNAL_ERROR",
    },
    500,
  );
}

