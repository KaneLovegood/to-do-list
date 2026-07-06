import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  return response;
}

function isCrossSiteApiMutation(request: NextRequest) {
  if (
    SAFE_METHODS.has(request.method) ||
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    return false;
  }

  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return true;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin !== request.nextUrl.origin;
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  if (isCrossSiteApiMutation(request)) {
    return applySecurityHeaders(
      NextResponse.json(
        { message: "Cross-site API requests are not allowed." },
        { status: 403 },
      ),
    );
  }

  const response = NextResponse.next();

  // Auth and todo responses are user-specific and must not be cached by an
  // intermediary. NestJS remains the authorization boundary for these APIs.
  if (/^\/api\/(auth|todos)(?:\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "no-store");
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
