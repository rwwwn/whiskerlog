import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const logMealSchema = z.object({
  pet_ids: z.array(z.string().uuid()).min(1),
  slot_label: z.string().min(1).max(100),
  food_type: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  vitamins: z.array(z.string()).optional().default([]),
  occurred_at: z.string().datetime().optional(),
  did_not_eat_ids: z.array(z.string().uuid()).optional().default([]),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // get household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!membership) return NextResponse.json({ error: "No household" }, { status: 403 });

  const body = await req.json();
  const parsed = logMealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { pet_ids, slot_label, food_type, notes, vitamins, occurred_at, did_not_eat_ids } = parsed.data;
  const occurredAt = occurred_at ?? new Date().toISOString();
  const didNotEatSet = new Set(did_not_eat_ids);

  // 1. Insert meal_event
  const { data: event, error: eventErr } = await supabase
    .from("meal_events")
    .insert({
      household_id: membership.household_id,
      logged_by: user.id,
      slot_label,
      food_type: food_type ?? null,
      notes: notes ?? null,
      vitamins: vitamins ?? [],
      occurred_at: occurredAt,
    })
    .select("id")
    .single();

  if (eventErr || !event) {
    return NextResponse.json({ error: eventErr?.message ?? "Failed to create meal event" }, { status: 500 });
  }

  // 2. Fetch active meal plans for all pets
  const { data: mealPlans } = await supabase
    .from("meal_plans")
    .select("id, pet_id")
    .in("pet_id", pet_ids)
    .eq("is_active", true);

  const planByPet: Record<string, string> = {};
  (mealPlans ?? []).forEach((p) => {
    planByPet[p.pet_id] = p.id;
  });

  // 3. Insert meal_event_pets rows
  const petRows = pet_ids.map((pid) => ({
    meal_event_id: event.id,
    pet_id: pid,
    meal_plan_id: planByPet[pid] ?? null,
    did_eat: !didNotEatSet.has(pid),
    notes: null,
  }));

  const { error: petsErr } = await supabase.from("meal_event_pets").insert(petRows);
  if (petsErr) {
    return NextResponse.json({ error: petsErr.message }, { status: 500 });
  }

  // 4. Insert log_entries (fed_food) per pet + update meal_completions
  const today = new Date(occurredAt).toISOString().split("T")[0];

  for (const pid of pet_ids) {
    const didEat = !didNotEatSet.has(pid);

    // log_entry
    await supabase.from("log_entries").insert({
      pet_id: pid,
      logged_by: user.id,
      event_type: "fed_food",
      occurred_at: occurredAt,
      food_name: food_type ?? null,
      notes: notes ?? null,
      did_eat: didEat,
      vitamin_name: vitamins && vitamins.length > 0 ? vitamins.join(", ") : null,
    });

    // meal_completions — upsert a completed slot for this plan/day
    const planId = planByPet[pid];
    if (planId) {
      const { data: existing } = await supabase
        .from("meal_completions")
        .select("id, completed_slots, vitamins_given")
        .eq("meal_plan_id", planId)
        .eq("pet_id", pid)
        .eq("completion_date", today)
        .single();

      const newSlot = {
        slot: slot_label,
        completed_at: occurredAt,
        notes: notes ?? null,
      };

      if (existing) {
        const slots = Array.isArray(existing.completed_slots) ? existing.completed_slots : [];
        const existingVitamins = Array.isArray(existing.vitamins_given) ? existing.vitamins_given : [];
        const mergedVitamins = Array.from(new Set([...existingVitamins, ...(vitamins ?? [])]));
        await supabase
          .from("meal_completions")
          .update({ completed_slots: [...slots, newSlot], vitamins_given: mergedVitamins })
          .eq("id", existing.id);
      } else {
        await supabase.from("meal_completions").insert({
          meal_plan_id: planId,
          pet_id: pid,
          completed_by: user.id,
          completion_date: today,
          completed_slots: [newSlot],
          vitamins_given: vitamins ?? [],
        });
      }
    }
  }

  return NextResponse.json({ data: { meal_event_id: event.id } }, { status: 201 });
}
