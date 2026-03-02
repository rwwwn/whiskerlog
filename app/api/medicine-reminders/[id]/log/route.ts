import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const logSchema = z.object({
  completion_date: z.string(), // YYYY-MM-DD
  notes: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  // Verify reminder ownership
  const supabaseAny = supabase as any;

  const { data: reminder } = await supabaseAny
    .from("medicine_reminders")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!reminder || reminder.user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Log the completion (upsert in case it already exists)
  const { data, error } = await supabaseAny
    .from("medicine_reminder_logs")
    .upsert(
      {
        reminder_id: id,
        completion_date: parsed.data.completion_date,
        logged_by: user.id,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: "reminder_id,completion_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
