import { NextResponse, type NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const headers = securityHeaders();

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  response.headers.set("X-RepoRadar-Request-Path", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};

