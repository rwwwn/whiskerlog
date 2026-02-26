import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  dosage: z.string().optional(),
  frequency: z
    .enum([
      "once",
      "daily",
      "twice_daily",
      "three_times_daily",
      "weekly",
      "biweekly",
      "monthly",
      "as_needed",
    ])
    .optional(),
  start_date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  total_doses: z.number().int().positive().nullable().optional(),
  prescribed_by: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("treatment_plans")
    .select(
      `
      *,
      pets!inner(id, name, user_id),
      treatment_logs(id, log_date, logged_by, completed_items, notes)
    `
    )
    .eq("id", id)
    .eq("pets.user_id", user.id)
    .order("log_date", { referencedTable: "treatment_logs", ascending: false })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify ownership via pet
  const { data: existing } = await supabase
    .from("treatment_plans")
    .select("id, pets!inner(user_id)")
    .eq("id", id)
    .eq("pets.user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("treatment_plans")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: existing } = await supabase
    .from("treatment_plans")
    .select("id, pets!inner(user_id)")
    .eq("id", id)
    .eq("pets.user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("treatment_plans").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
