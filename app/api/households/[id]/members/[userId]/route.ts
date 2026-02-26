import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/households/[id]/members/[userId] — change member role
// DELETE — remove member from household
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Must be owner
  const { data: myMember } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (myMember?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { role } = body;

  if (!["member", "viewer"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be member or viewer" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("household_members")
    .update({ role })
    .eq("household_id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: myMember } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  // Owner can remove anyone. Members can remove themselves.
  const isSelf = userId === user.id;
  if (myMember?.role !== "owner" && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("household_members")
    .update({ is_active: false })
    .eq("household_id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
