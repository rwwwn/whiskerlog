import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const medicalRecordSchema = z.object({
  pet_id: z.string().uuid(),
  record_date: z.string().min(1),
  vet_name: z.string().max(120).optional(),
  clinic_name: z.string().max(120).optional(),
  diagnosis: z.string().max(500).optional(),
  treatment: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  follow_up_date: z.string().optional().nullable(),
  prescribed_medications: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        duration_days: z.number().optional(),
      })
    )
    .optional(),
});

// GET /api/medical?pet_id=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const petId = searchParams.get("pet_id");

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("medical_records")
    .select("*, pets!inner(name, user_id)")
    .eq("pets.user_id", user.id)
    .order("record_date", { ascending: false });

  if (petId) query = query.eq("pet_id", petId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/medical
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
  const parsed = medicalRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  // Verify pet access
  const { data: pet } = await supabase
    .from("pets")
    .select("id, user_id")
    .eq("id", parsed.data.pet_id)
    .single();

  if (!pet || pet.user_id !== user.id) {
    return NextResponse.json({ error: "Pet not found or access denied" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("medical_records")
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
