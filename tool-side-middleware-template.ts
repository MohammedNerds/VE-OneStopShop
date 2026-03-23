// ═══════════════════════════════════════════════════════════════
// TOOL-SIDE MIDDLEWARE — Drop into each tool repo (viccal, etc.)
// ═══════════════════════════════════════════════════════════════
// File: middleware.ts (root of each tool's Next.js project)
//
// This middleware validates that requests come through the ve-tools
// proxy by checking for the x-proxy-secret header. Any direct
// browser request (missing the header) gets a 403.
//
// SETUP:
// 1. Copy this file to the root of your tool repo (e.g., viccal/)
// 2. Add PROXY_SECRET to the tool's .env.local and Vercel env vars
//    (must match the same secret in ve-tools)
// 3. Deploy
//
// TESTING:
// - Visit the tool URL directly in a browser → should get 403
// - Access via ve-tools portal → should work normally
// ═══════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const proxySecret = request.headers.get("x-proxy-secret");
  const expectedSecret = process.env.PROXY_SECRET;

  // In development, optionally bypass the check
  if (process.env.NODE_ENV === "development" && !expectedSecret) {
    return NextResponse.next();
  }

  // Reject requests without the correct proxy secret
  if (!expectedSecret || proxySecret !== expectedSecret) {
    return new NextResponse(
      JSON.stringify({
        error: "Direct access not allowed.",
        message: "This tool is only accessible through the VE Tools portal.",
        portal: "https://ve-tools.vercel.app",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          // Prevent caching of the 403
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // Valid proxy request — extract user context from headers
  const response = NextResponse.next();

  // Make user context available to the app via response headers
  // (readable via headers() in Server Components / Route Handlers)
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  const userName = request.headers.get("x-user-name");
  const userRole = request.headers.get("x-user-role");

  if (userId) response.headers.set("x-user-id", userId);
  if (userEmail) response.headers.set("x-user-email", userEmail);
  if (userName) response.headers.set("x-user-name", userName);
  if (userRole) response.headers.set("x-user-role", userRole);

  return response;
}

export const config = {
  // Apply to all routes except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
