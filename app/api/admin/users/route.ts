import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin"].includes(profile.role)) return null;
  return { supabase, user, profile };
}

// GET /api/admin/users — list all users
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// PATCH /api/admin/users — update user role or tool access
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, role, toolAccess, status } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (role !== undefined) update.role = role;
  if (toolAccess !== undefined) update.tool_access = toolAccess;
  if (status !== undefined) update.status = status;

  const { error } = await auth.supabase
    .from("profiles")
    .update(update)
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users — remove user
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await request.json();

  // Note: Deleting from profiles cascades from auth.users deletion.
  // To fully remove, use the service role client to delete from auth.users.
  // For now, we disable the user instead of hard-deleting.
  const { error } = await auth.supabase
    .from("profiles")
    .update({ status: "disabled" })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
