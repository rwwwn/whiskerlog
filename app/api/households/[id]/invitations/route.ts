import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/households/[id]/invitations — list pending invitations (owner only)
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

  // Verify user is owner
  const { data: myMembership } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (myMembership?.role !== "owner") {
    return NextResponse.json(
      { error: "Only household owner can view invitations" },
      { status: 403 }
    );
  }

  // Fetch all invitations (pending, accepted, and declined)
  const { data: invitations, error } = await supabase
    .from("household_invitations")
    .select("id, email, role, status, created_at, expires_at, accepted_at")
    .eq("household_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: invitations || [] });
}

// DELETE /api/households/[id]/invitations/[inviteId] — cancel invitation (owner only)
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

  // Verify user is owner
  const { data: myMembership } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (myMembership?.role !== "owner") {
    return NextResponse.json(
      { error: "Only household owner can cancel invitations" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(_req.url);
  const inviteId = searchParams.get("invite_id");

  if (!inviteId) {
    return NextResponse.json(
      { error: "invite_id query parameter required" },
      { status: 400 }
    );
  }

  // Update invitation status to declined
  const { error } = await supabase
    .from("household_invitations")
    .update({ status: "declined" })
    .eq("id", inviteId)
    .eq("household_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
