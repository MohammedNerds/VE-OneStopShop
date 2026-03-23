import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const cookieNames = allCookies.map((c) => ({
    name: c.name,
    length: c.value.length,
    preview: c.value.substring(0, 20) + "...",
  }));

  let sessionData = null;
  let userData = null;
  let profileData = null;
  let sessionError = null;
  let userError = null;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const sessionResult = await supabase.auth.getSession();
    sessionData = sessionResult.data.session
      ? {
          user_id: sessionResult.data.session.user.id,
          email: sessionResult.data.session.user.email,
          expires_at: sessionResult.data.session.expires_at,
        }
      : null;
    sessionError = sessionResult.error?.message || null;

    const userResult = await supabase.auth.getUser();
    userData = userResult.data.user
      ? { id: userResult.data.user.id, email: userResult.data.user.email }
      : null;
    userError = userResult.error?.message || null;

    if (userResult.data.user) {
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userResult.data.user.id)
        .single();
      profileData = profile;
      if (profErr) profileData = { error: profErr.message };
    }
  } catch (err: any) {
    sessionError = err.message;
  }

  return NextResponse.json({
    cookies: cookieNames,
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    site_url: process.env.NEXT_PUBLIC_SITE_URL,
    getSession: { data: sessionData, error: sessionError },
    getUser: { data: userData, error: userError },
    profile: profileData,
  });
}