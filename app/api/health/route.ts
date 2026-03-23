import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateToolConfig, TOOL_CATALOG } from "@/lib/tools";

/**
 * GET /api/health
 * Admin-only health check that validates:
 * - Supabase connection
 * - All live tools have env vars configured
 * - Proxy secret is set
 *
 * Use after deploying or adding a new tool to verify everything is wired.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Check tool configs
  const toolCheck = validateToolConfig();

  // Check proxy secret
  const hasProxySecret = !!process.env.PROXY_SECRET;

  // Check Supabase connection
  let supabaseOk = false;
  try {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    supabaseOk = true;
  } catch {}

  // Summary
  const allOk = toolCheck.valid && hasProxySecret && supabaseOk;

  return NextResponse.json({
    status: allOk ? "healthy" : "issues_found",
    checks: {
      supabase: {
        ok: supabaseOk,
        detail: supabaseOk ? "Connected" : "Cannot reach Supabase",
      },
      proxy_secret: {
        ok: hasProxySecret,
        detail: hasProxySecret ? "Set" : "MISSING — proxy will not work",
      },
      tools: {
        ok: toolCheck.valid,
        total: TOOL_CATALOG.length,
        live: TOOL_CATALOG.filter((t) => t.status === "live").length,
        missing_env_vars: toolCheck.missing,
        detail: toolCheck.valid
          ? "All live tools have env vars"
          : `Missing: ${toolCheck.missing.join(", ")}`,
      },
    },
    tool_env_var_convention: "Tool ID 'my-tool' → env var TOOL_URL_MY_TOOL",
  });
}
