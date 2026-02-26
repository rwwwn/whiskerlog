import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const sessionSchema = z.object({
  pet_id: z.string().uuid(),
  reason: z.string().min(1).max(500).optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
  duration_days: z.number().int().min(1).max(365).optional(),
  started_at: z.string().optional(),
});

// GET /api/risk — active risk sessions for current user's pets
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const petId = searchParams.get("pet_id");
  const activeOnly = searchParams.get("active") !== "false";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("risk_monitoring_sessions")
    .select("*, pets!inner(name, user_id)")
    .eq("pets.user_id", user.id)
    .order("start_date", { ascending: false })
    .limit(50);

  if (petId) query = query.eq("pet_id", petId);
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/risk — start a risk monitoring session
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = sessionSchema.safeParse(body);
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
    .from("risk_monitoring_sessions")
    .insert({
      pet_id: parsed.data.pet_id,
      created_by: user.id,
      reason: parsed.data.reason ?? "مراقبة عامة",
      duration_days: parsed.data.duration_days ?? 7,
      severity: parsed.data.severity ?? "low",
      symptoms: parsed.data.symptoms ?? [],
      notes: parsed.data.notes ?? null,
      start_date: parsed.data.started_at ?? new Date().toISOString(), // trigger computes end_date
      is_active: true,
    } as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
