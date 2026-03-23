import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    // Collect cookies that Supabase wants to set
    const cookiesToSet: { name: string; value: string; options?: any }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies: { name: string; value: string; options?: any }[]) {
            // Don't set on cookieStore — collect them instead
            cookiesToSet.push(...cookies);
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Create the redirect response FIRST
      const response = NextResponse.redirect(`${origin}${next}`);

      // NOW set all cookies directly on the redirect response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });

      // Update profile (fire and forget — don't block redirect)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from("profiles")
            .update({ last_login: new Date().toISOString(), status: "active" })
            .eq("id", user.id);
        }
      });

      return response;
    }

    console.error("Auth callback error:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // Handle OAuth error params
  const errorParam =
    searchParams.get("error_description") || searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorParam)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=no_code_received`);
}