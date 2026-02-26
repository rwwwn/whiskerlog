import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const vitaminSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "as_needed"]).optional().default("daily"),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  dose: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

const petVitaminSchema = z.object({
  pet_id: z.string().uuid(),
  vitamin_id: z.string().uuid(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  notes: z.string().max(500).optional(),
});

// Used when the form sends a free-text vitamin name (no pre-existing catalog entry)
const directAssignSchema = z.object({
  pet_id: z.string().uuid(),
  vitamin_name: z.string().min(1).max(200),
  dosage: z.string().max(100).optional(),
  frequency: z.string().optional().default("daily"),
  notes: z.string().max(500).optional(),
});

// GET /api/vitamins — list all vitamins catalog
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const petId = searchParams.get("pet_id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (petId) {
    // Return pet's vitamin schedule + today's completion status via view
    const { data, error } = await supabase
      .from("todays_vitamins_view")
      .select("*")
      .eq("pet_id", petId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Return global vitamins catalog
  const { data, error } = await supabase
    .from("vitamins")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/vitamins — add a vitamin to catalog
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // ── Quick assign: form sends vitamin_name directly (no catalog lookup needed) ──
  if (body.pet_id && body.vitamin_name && !body.vitamin_id) {
    const parsed = directAssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
    }

    const { data: pet } = await supabase
      .from("pets")
      .select("id, user_id, household_id")
      .eq("id", parsed.data.pet_id)
      .single();

    if (!pet || pet.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Find existing vitamin by name (scoped to household if available)
    let vitaminId: string;
    const vitaminQuery = supabase
      .from("vitamins")
      .select("id")
      .ilike("name", parsed.data.vitamin_name);
    if (pet.household_id) {
      (vitaminQuery as any).eq("household_id", pet.household_id);
    }
    const { data: existing } = await (vitaminQuery as any).maybeSingle();

    if (existing) {
      vitaminId = existing.id;
    } else {
      // Create new catalog entry
      const vitaminFreq = (["daily", "weekly", "monthly", "as_needed"] as const).includes(
        parsed.data.frequency as any
      )
        ? (parsed.data.frequency as "daily" | "weekly" | "monthly" | "as_needed")
        : "daily";

      const { data: newVit, error: vitErr } = await supabase
        .from("vitamins")
        .insert({
          name: parsed.data.vitamin_name,
          household_id: pet.household_id ?? null,
          frequency: vitaminFreq,
          dose: parsed.data.dosage ?? null,
        } as any)
        .select("id")
        .single();

      if (vitErr) return NextResponse.json({ error: vitErr.message }, { status: 500 });
      vitaminId = newVit.id;
    }

    // Assign vitamin to pet
    const { data, error } = await supabase
      .from("pet_vitamins")
      .insert({
        pet_id: parsed.data.pet_id,
        vitamin_id: vitaminId,
        assigned_by: user.id,
        start_date: new Date().toISOString().split("T")[0],
        notes: parsed.data.notes ?? null,
        is_active: true,
      } as any)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  }

  // ── Assign existing catalog vitamin to pet (vitamin_id provided) ──
  if (body.pet_id && body.vitamin_id) {
    const parsed = petVitaminSchema.safeParse(body);
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
      .from("pet_vitamins")
      .insert({
        pet_id: parsed.data.pet_id,
        vitamin_id: parsed.data.vitamin_id,
        assigned_by: user.id,
        start_date: parsed.data.start_date ?? new Date().toISOString().split("T")[0],
        end_date: parsed.data.end_date ?? null,
        notes: parsed.data.notes ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  }

  // Add to catalog — requires household_id
  const parsed = vitaminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const household_id = body.household_id as string | undefined;
  if (!household_id) {
    return NextResponse.json({ error: "household_id is required to add a vitamin to the catalog" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vitamins")
    .insert({ ...parsed.data, household_id } as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
