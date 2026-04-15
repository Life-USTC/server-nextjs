import { type NextRequest, NextResponse } from "next/server";
import { logApiRequest, shouldLog } from "@/lib/log/app-logger";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  if (shouldLog("debug")) {
    logApiRequest(request.method, pathname, 0, 0, {
      requestId,
      event: "request.start",
    });
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
