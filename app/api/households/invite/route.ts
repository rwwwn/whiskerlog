import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// POST /api/households/invite — send invitation by email
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
  const { household_id, email, role } = body;

  if (!household_id || !email || !role) {
    return NextResponse.json(
      { error: "household_id, email, and role are required" },
      { status: 400 }
    );
  }

  if (!["member", "viewer"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be member or viewer" },
      { status: 400 }
    );
  }

  // Verify sender is owner or member with write access
  const { data: senderMember } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", household_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!senderMember || senderMember.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate secure token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Check for existing pending invite
  const { data: existing } = await supabase
    .from("household_invitations")
    .select("id")
    .eq("household_id", household_id)
    .eq("email", email)
    .eq("status", "pending")
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "An invitation is already pending for this email" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("household_invitations")
    .insert({
      household_id,
      invited_by: user.id,
      email,
      role,
      token,
      expires_at: expiresAt,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The token-based invite URL — frontend sends the email
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/invite/${token}`;

  return NextResponse.json({ data, inviteUrl }, { status: 201 });
}
