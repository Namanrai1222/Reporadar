import { NextResponse, type NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const headers = securityHeaders(nonce);
  // Next.js reads the nonce from the request's CSP and applies it to its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", headers["Content-Security-Policy"]);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  response.headers.set("X-RepoRadar-Request-Path", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};

