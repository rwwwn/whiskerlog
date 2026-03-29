import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Resend } from "resend";

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

  // The token-based invite URL
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/invite/${token}`;

  // Get household details for email
  const { data: household } = await supabase
    .from("households")
    .select("name")
    .eq("id", household_id)
    .single();

  const { data: inviter } = await supabase
    .from("profiles")
    .select("display_name, full_name")
    .eq("id", user.id)
    .single();

  const inviterName = inviter?.display_name || inviter?.full_name || "Someone";
  const householdName = household?.name || "the household";

  // Send email invitation (if Resend is configured)
  if (resend) {
    try {
      await resend.emails.send({
        from: "WhiskerLog <invites@whiskerlog.app>",
        to: email,
        subject: `${inviterName} invited you to join ${householdName} on WhiskerLog`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">You're invited to ${householdName}!</h2>
  <p style="color: #666; font-size: 16px;">
    <strong>${inviterName}</strong> has invited you to join their household on WhiskerLog, 
    a pet care companion app for families.
  </p>
  
  <p style="color: #666; font-size: 16px;">
    As a <strong>${role}</strong>, you'll be able to ${
          role === "member"
            ? "view and log pet data, including meals, medications, and behavior"
            : "view all household pet data and activity"
        }.
  </p>
  
  <div style="margin: 30px 0;">
    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 30px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
      Accept Invitation
    </a>
  </div>
  
  <p style="color: #999; font-size: 14px; margin-top: 30px;">
    This invitation expires in 7 days.
  </p>
  
  <p style="color: #999; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
    WhiskerLog • Pet Care for Families
  </p>
</div>`,
      });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Still return success since invitation was created, but log the error
    }
  } else {
    console.warn("RESEND_API_KEY not configured. Email invitation not sent. Share the link manually:", inviteUrl);
  }

  return NextResponse.json({ data, inviteUrl }, { status: 201 });
}
