import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type UserProfile } from "@/lib/access";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch all users
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <AdminClient
      currentUser={profile as UserProfile}
      initialUsers={(users || []) as UserProfile[]}
    />
  );
}
