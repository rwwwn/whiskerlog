import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/treatments/[id]/log — record a treatment dose
const logSchema = z.object({
  logged_at: z.string().optional(),
  dose_given: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  skipped: z.boolean().optional(),
  skip_reason: z.string().max(200).optional(),
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
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  // Verify plan access
  const { data: plan } = await supabase
    .from("treatment_plans")
    .select("id, pet_id, is_active, pets(user_id)")
    .eq("id", id)
    .single();

  if (!plan || (plan as any).pets?.user_id !== user.id) {
    return NextResponse.json({ error: "Not found or access denied" }, { status: 403 });
  }

  if (!plan.is_active) {
    return NextResponse.json({ error: "Treatment plan is no longer active" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("treatment_logs")
    .insert({
      treatment_plan_id: id,
      pet_id: (plan as any).pet_id,
      logged_by: user.id,
      log_date: (parsed.data.logged_at ?? new Date().toISOString()).split("T")[0],
      completed_items: [{
        dose_given: parsed.data.dose_given ?? null,
        skipped: parsed.data.skipped ?? false,
        skip_reason: parsed.data.skip_reason ?? null,
        logged_at: parsed.data.logged_at ?? new Date().toISOString(),
      }],
      notes: parsed.data.notes ?? null,
    } as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch plan + logs together
  const [planRes, logsRes] = await Promise.all([
    supabase
      .from("treatment_plans")
      .select("*, pets(name, user_id)")
      .eq("id", id)
      .single(),
    supabase
      .from("treatment_logs")
      .select("*, profiles(display_name)")
      .eq("treatment_plan_id", id)
      .order("log_date", { ascending: false }),
  ]);

  if (!planRes.data || (planRes.data as any).pets?.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ plan: planRes.data, logs: logsRes.data ?? [] });
}
