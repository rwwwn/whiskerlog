import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const mealPlanSchema = z.object({
  pet_id: z.string().uuid(),
  meals_per_day: z.number().int().min(1).max(10).default(2),
  meal_times: z.array(z.string()).optional().default([]),
  food_type: z.string().max(100).optional(),
  food_brand: z.string().max(100).optional(),
  portion_grams: z.number().positive().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const petId = searchParams.get("pet_id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("meal_plans")
    .select(`
      *,
      pets!inner(name, user_id),
      meal_completions(id, completion_date, completed_slots, completed_by)
    `)
    .eq("pets.user_id", user.id)
    .order("created_at", { ascending: false });

  if (petId) query = query.eq("pet_id", petId);

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
  const parsed = mealPlanSchema.safeParse(body);
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

  const { data, error } = await supabase
    .from("meal_plans")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
