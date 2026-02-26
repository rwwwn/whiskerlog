import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const treatmentSchema = z.object({
  pet_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  start_date: z.string().min(1),
  end_date: z.string().optional().nullable(),
  frequency: z.enum([
    "once",
    "daily",
    "twice_daily",
    "three_times_daily",
    "weekly",
    "biweekly",
    "monthly",
    "as_needed",
  ]),
  total_doses: z.number().int().positive().optional().nullable(),
  dosage: z.string().max(100).optional(),
  prescribed_by: z.string().max(120).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const petId = searchParams.get("pet_id");
  const activeOnly = searchParams.get("active") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("treatment_plans")
    .select(`
      *,
      pets!inner(name, user_id),
      treatment_logs(id, log_date, completed_items, notes)
    `)
    .eq("pets.user_id", user.id)
    .order("start_date", { ascending: false });

  if (petId) query = query.eq("pet_id", petId);
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = treatmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("id, user_id")
    .eq("id", parsed.data.pet_id)
    .single();

  if (!pet || pet.user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { frequency, dosage, prescribed_by, ...planData } = parsed.data as any;
  const medication_schedule = frequency
    ? [{ frequency, dose: dosage ?? null, prescribed_by: prescribed_by ?? null }]
    : [];

  const { data, error } = await supabase
    .from("treatment_plans")
    .insert({ ...planData, medication_schedule, created_by: user.id, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
