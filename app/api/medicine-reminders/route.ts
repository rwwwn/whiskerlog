import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reminderSchema = z.object({
  pet_id: z.string().uuid(),
  medicine_name: z.string().min(1).max(200),
  dosage: z.string().max(100).optional(),
  time_of_day: z.string(), // HH:MM format
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1, "اختر يوماً على الأقل"),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const petId = searchParams.get("pet_id");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAny = supabase as any;

  let query = supabaseAny
    .from("medicine_reminders")
    .select("*, pets(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("time_of_day", { ascending: true });

  if (petId) query = query.eq("pet_id", petId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = reminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  // Verify pet ownership
  const { data: pet } = await supabase
    .from("pets")
    .select("id, user_id")
    .eq("id", parsed.data.pet_id)
    .single();

  if (!pet || pet.user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const supabaseAny = supabase as any;

  const { data, error } = await supabaseAny
    .from("medicine_reminders")
    .insert({
      ...parsed.data,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
