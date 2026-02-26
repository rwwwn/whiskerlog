import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z
  .object({
    severity: z.enum(["low", "medium", "high"]),
    symptoms: z.array(z.string()),
    notes: z.string().max(1000).nullable(),
    is_active: z.boolean(),
    resolved_at: z.string().nullable(),
    resolution_notes: z.string().max(500).nullable(),
  })
  .partial();

export async function PATCH(
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { data: existing } = await supabase
    .from("risk_monitoring_sessions")
    .select("created_by")
    .eq("id", id)
    .single();

  if (existing?.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Auto-set resolved_at when closing
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.is_active === false && !parsed.data.resolved_at) {
    updateData.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("risk_monitoring_sessions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("risk_monitoring_sessions")
    .select("created_by")
    .eq("id", id)
    .single();

  if (existing?.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("risk_monitoring_sessions")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
