import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Json } from "@/types";

const LOG_EVENT_TYPES = [
  "fed_food", "gave_medication", "gave_vitamins", "grooming",
  "litter_cleaned", "behavior_observed", "vet_visit", "weight_recorded", "other",
] as const;

// Matches what LogEntryForm submits
const logEntrySchema = z.object({
  pet_id:       z.string().uuid(),
  event_type:   z.enum(LOG_EVENT_TYPES),
  event_date:   z.string().min(1, "التاريخ مطلوب"),
  quantity:     z.number().nullable().optional(),
  unit:         z.string().max(20).optional(),
  notes:        z.string().max(1000).optional().or(z.literal("")),
  weight_kg:    z.number().positive().nullable().optional(),
  vet_name:     z.string().max(120).optional(),
  clinic_name:  z.string().max(120).optional(),
});

// GET /api/logs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const petId = searchParams.get("pet_id");
  const eventType = searchParams.get("event_type");
  const limit = parseInt(searchParams.get("limit") ?? "30");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("log_entries")
    .select(
      `*, pets!inner(name, user_id), profiles(display_name)`,
      { count: "exact" }
    )
    .order("occurred_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Scope to the authenticated user's pets
  query = query.eq("pets.user_id", user.id);

  if (petId) query = query.eq("pet_id", petId);
  if (eventType) query = query.eq("event_type", eventType as any);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count });
}

// POST /api/logs
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = logEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  const v = parsed.data;

  // Verify pet access — user owns or belongs to the pet's household
  const { data: pet } = await supabase
    .from("pets")
    .select("id, household_id, user_id")
    .eq("id", v.pet_id)
    .single();

  if (!pet) {
    return NextResponse.json(
      { error: "Pet not found or access denied" },
      { status: 403 }
    );
  }

  // Must be owner OR household member with write access
  const isOwner = pet.user_id === user.id;
  if (!isOwner && pet.household_id) {
    const { data: member } = await supabase
      .from("household_members")
      .select("role")
      .eq("household_id", pet.household_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!member || member.role === "viewer") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  } else if (!isOwner) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Extra fields go into metadata
  const metadata: Record<string, unknown> = {};
  if (v.quantity != null) metadata.quantity = v.quantity;
  if (v.unit)             metadata.unit = v.unit;
  if (v.vet_name)         metadata.vet_name = v.vet_name;
  if (v.clinic_name)      metadata.clinic_name = v.clinic_name;

  const { data, error } = await supabase
    .from("log_entries")
    .insert({
      pet_id:       v.pet_id,
      created_by:   user.id,
      household_id: pet.household_id ?? null,
      event_type:   v.event_type,
      occurred_at:  new Date(v.event_date).toISOString(),
      weight_kg:    v.weight_kg ?? null,
      notes:        v.notes || null,
      metadata:     Object.keys(metadata).length > 0 ? metadata as Json : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
