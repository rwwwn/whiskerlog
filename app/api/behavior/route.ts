import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  pet_id: z.string().uuid(),
  observed_at: z.string().min(1),
  behavior_type_ids: z.array(z.string().uuid()).min(1),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional(),
  triggers: z.string().max(500).optional(),
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
    .from("behavior_observations")
    .select(`
      *,
      pets!inner(name, user_id),
      behavior_observation_types(behavior_type_id, behavior_types(slug, label_ar, label_en, is_concern))
    `)
    .eq("pets.user_id", user.id)
    .order("observed_at", { ascending: false })
    .limit(50);

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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("id, user_id")
    .eq("id", parsed.data.pet_id)
    .single();

  if (!pet || pet.user_id !== user.id) {
    return NextResponse.json({ error: "Pet not found or access denied" }, { status: 403 });
  }

  const { behavior_type_ids, ...rest } = parsed.data;

  const { data: obs, error: obsError } = await supabase
    .from("behavior_observations")
    .insert({ ...rest, created_by: user.id } as any)
    .select()
    .single();

  if (obsError) return NextResponse.json({ error: obsError.message }, { status: 500 });

  // Insert junction rows
  if (behavior_type_ids.length > 0) {
    await (supabase as any).from("behavior_observation_types").insert(
      behavior_type_ids.map((btId) => ({
        observation_id: obs.id,
        behavior_type_id: btId,
      }))
    );
  }

  return NextResponse.json({ data: obs }, { status: 201 });
}
