import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const supabaseAny = supabase as any;

  const { data: reminder } = await supabaseAny
    .from("medicine_reminders")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!reminder || reminder.user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { error } = await supabaseAny
    .from("medicine_reminders")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
