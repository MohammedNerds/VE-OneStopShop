import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type UserProfile } from "@/lib/access";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile with role and tool access
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Profile doesn't exist yet — this can happen if the trigger hasn't run
    // or if this is a fresh signup. Redirect to login.
    redirect("/login");
  }

  return <DashboardClient user={profile as UserProfile} />;
}
