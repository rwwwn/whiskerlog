import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/meals/[id]/complete — mark a meal slot as completed
const completeSchema = z.object({
  slot: z.string().min(1),
  completed_at: z.string().optional(),
  notes: z.string().max(300).optional(),
  quantity_given_grams: z.number().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { data: plan } = await supabase
    .from("meal_plans")
    .select("id, pet_id, is_active, pets(user_id)")
    .eq("id", id)
    .single();

  if (!plan || (plan as any).pets?.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("meal_completions")
    .insert({
      meal_plan_id: id,
      pet_id: (plan as any).pet_id,
      completed_by: user.id,
      completion_date: new Date().toISOString().split("T")[0],
      completed_slots: [{
        slot: parsed.data.slot,
        completed_at: parsed.data.completed_at ?? new Date().toISOString(),
        notes: parsed.data.notes ?? null,
        quantity_given_grams: parsed.data.quantity_given_grams ?? null,
      }],
    } as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
