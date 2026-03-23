import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getToolUrl } from "@/lib/tools";
import { canAccessTool, type Role } from "@/lib/access";

// ═══════════════════════════════════════════════════════════════
// /api/proxy/[...path] — Secure Reverse Proxy
// ═══════════════════════════════════════════════════════════════
// This is the KEY security piece. Every tool request goes through here.
//
// Flow:
// 1. Browser requests /api/proxy/tco-calculator/some/page
// 2. We validate the Supabase session
// 3. We check the user's profile.tool_access array
// 4. We look up the REAL tool URL from server-only env vars
// 5. We fetch from the real URL, passing user context in headers
// 6. We rewrite internal links so they route back through this proxy
// 7. We return the response — browser never sees the real URL
// ═══════════════════════════════════════════════════════════════

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove: (name: string, options: CookieOptions) => {
          try { cookieStore.set({ name, value: "", ...options }); } catch {}
        },
      },
    }
  );
}

async function validateAndGetProfile(supabase: Awaited<ReturnType<typeof getSupabase>>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tool_access, status, email, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") return null;

  return { user, profile };
}

async function proxyRequest(
  request: NextRequest,
  method: string,
  params: { path: string[] }
) {
  const [toolId, ...rest] = params.path;
  const subPath = rest.length > 0 ? `/${rest.join("/")}` : "";

  // ── 1. Authenticate ──
  const supabase = await getSupabase();
  const auth = await validateAndGetProfile(supabase);

  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized — please sign in at /login" },
      { status: 401 }
    );
  }

  const { user, profile } = auth;

  // ── 2. Check per-user tool access ──
  const hasAccess = canAccessTool(
    profile.role as Role,
    profile.tool_access || [],
    toolId
  );

  if (!hasAccess) {
    // Log the denied attempt
    await supabase.from("tool_access_log").insert({
      user_id: user.id,
      user_email: profile.email,
      tool_id: toolId,
      action: "denied",
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      { error: "You do not have access to this tool. Contact your admin." },
      { status: 403 }
    );
  }

  // ── 3. Resolve real tool URL (server-only env var) ──
  const toolBaseUrl = getToolUrl(toolId);

  if (!toolBaseUrl) {
    return NextResponse.json(
      { error: "Tool not configured or not yet deployed" },
      { status: 404 }
    );
  }

  // ── 4. Build the target URL ──
  const targetUrl = new URL(subPath || "/", toolBaseUrl);

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // ── 5. Proxy the request ──
  try {
    const proxyHeaders: Record<string, string> = {
      // Shared secret — tool middleware validates this
      "x-proxy-secret": process.env.PROXY_SECRET || "",
      // User context — tool can read these to personalize
      "x-user-id": user.id,
      "x-user-email": profile.email || "",
      "x-user-name": profile.full_name || "",
      "x-user-role": profile.role,
      "x-proxy-origin": process.env.NEXT_PUBLIC_SITE_URL || "",
      // Standard headers
      Accept: request.headers.get("Accept") || "*/*",
      "User-Agent": "ve-tools-proxy/1.0",
    };

    // For POST/PUT, forward content type and body
    const fetchOptions: RequestInit = {
      method,
      headers: proxyHeaders,
      redirect: "manual",
    };

    if (method !== "GET" && method !== "HEAD") {
      fetchOptions.body = await request.text();
      proxyHeaders["Content-Type"] =
        request.headers.get("Content-Type") || "application/json";
    }

    const proxyResponse = await fetch(targetUrl.toString(), fetchOptions);

    // ── 6. Log successful access ──
    // Only log the initial page load, not every asset request
    if (!subPath || subPath === "/") {
      await supabase.from("tool_access_log").insert({
        user_id: user.id,
        user_email: profile.email,
        tool_id: toolId,
        action: "launch",
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      });
    }

    // ── 7. Handle redirects ──
    if (proxyResponse.status >= 300 && proxyResponse.status < 400) {
      const location = proxyResponse.headers.get("location");
      if (location) {
        // Rewrite redirect URLs to go through proxy
        const redirectUrl = new URL(location, toolBaseUrl);
        const proxyPath = `/api/proxy/${toolId}${redirectUrl.pathname}${redirectUrl.search}`;
        return NextResponse.redirect(new URL(proxyPath, request.url));
      }
    }

    // ── 8. Process response ──
    const contentType = proxyResponse.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await proxyResponse.text();

      // Rewrite asset paths: src="/" → src="/api/proxy/toolId/"
      // This handles <script src="/_next/...">, <link href="/_next/...">, etc.
      html = html.replace(
        /(href|src|action)="\//g,
        `$1="/api/proxy/${toolId}/`
      );

      // Rewrite fetch() calls in inline scripts
      html = html.replace(
        /fetch\("\//g,
        `fetch("/api/proxy/${toolId}/`
      );

      // Inject a <base> tag as a safety net for any relative URLs we missed.
      // This goes right after <head> if present.
      html = html.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="/api/proxy/${toolId}/">`
      );

      return new NextResponse(html, {
        status: proxyResponse.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Frame-Options": "SAMEORIGIN",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // For JS, CSS, images — pass through with caching
    const body = await proxyResponse.arrayBuffer();

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
    };

    // Cache static assets aggressively, don't cache API responses
    if (
      contentType.includes("javascript") ||
      contentType.includes("css") ||
      contentType.includes("image") ||
      contentType.includes("font")
    ) {
      responseHeaders["Cache-Control"] = "public, max-age=31536000, immutable";
    } else {
      responseHeaders["Cache-Control"] = "no-store";
    }

    return new NextResponse(body, {
      status: proxyResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Proxy Error] Tool: ${toolId}, Path: ${subPath}`, error);

    // Log the error
    await supabase.from("tool_access_log").insert({
      user_id: user.id,
      user_email: profile.email,
      tool_id: toolId,
      action: "proxy_error",
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
    }).catch(() => {}); // Don't let logging failure break the error response

    return NextResponse.json(
      { error: "Tool temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}

// Handle all HTTP methods
// Next.js 15: params is a Promise
export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, "GET", await ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, "POST", await ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, "PUT", await ctx.params);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, "PATCH", await ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, "DELETE", await ctx.params);
}
