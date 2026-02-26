import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/households/accept-invite — accept a household invitation
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Fetch the invitation
  const { data: invite, error: inviteError } = await supabase
    .from("household_invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 404 }
    );
  }

  // Check expiry
  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from("household_invitations")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return NextResponse.json(
      { error: "Invitation has expired" },
      { status: 410 }
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("household_members")
    .select("id, is_active")
    .eq("household_id", invite.household_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    if (existing.is_active) {
      return NextResponse.json(
        { error: "You are already a member of this household" },
        { status: 409 }
      );
    }
    // Reactivate
    await supabase
      .from("household_members")
      .update({ is_active: true, role: invite.role })
      .eq("id", existing.id);
  } else {
    await supabase.from("household_members").insert({
      household_id: invite.household_id,
      user_id: user.id,
      role: invite.role,
      is_active: true,
    });
  }

  // Mark invite as accepted
  await supabase
    .from("household_invitations")
    .update({ status: "accepted", accepted_by: user.id })
    .eq("id", invite.id);

  return NextResponse.json({ success: true, household_id: invite.household_id });
}
