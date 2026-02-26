import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/households/[id] — household details + members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify membership
  const { data: member } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [householdRes, membersRes, invitesRes] = await Promise.all([
    supabase.from("households").select("*").eq("id", id).single(),
    supabase
      .from("household_members")
      .select("*, profiles(display_name, avatar_url)")
      .eq("household_id", id)
      .eq("is_active", true),
    supabase
      .from("household_invitations")
      .select("*")
      .eq("household_id", id)
      .eq("status", "pending"),
  ]);

  return NextResponse.json({
    household: householdRes.data,
    members: membersRes.data ?? [],
    invitations: invitesRes.data ?? [],
    myRole: member.role,
  });
}

// PATCH /api/households/[id] — update name/description (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (member?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description } = body;

  const { data, error } = await supabase
    .from("households")
    .update({
      ...(name && { name: name.trim() }),
      ...(description !== undefined && {
        description: description?.trim() ?? null,
      }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/households/[id] — delete household (owner only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: household } = await supabase
    .from("households")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (household?.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("households").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
