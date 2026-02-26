import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const logSchema = z.object({
  pet_vitamin_id: z.string().uuid(),
  given_at: z.string().optional(),
  notes: z.string().max(300).optional(),
  skipped: z.boolean().optional(),
});

// POST /api/vitamins/log — record a vitamin dose given
export async function POST(req: NextRequest) {
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

  // Verify access via pet_vitamins → pets
  const { data: pv } = await supabase
    .from("pet_vitamins")
    .select("id, pets(user_id)")
    .eq("id", parsed.data.pet_vitamin_id)
    .single();

  if (!pv || (pv as any).pets?.user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("vitamin_logs")
    .insert({
      pet_vitamin_id: parsed.data.pet_vitamin_id,
      given_by: user.id,
      given_at: parsed.data.given_at ?? new Date().toISOString(),
      notes: parsed.data.notes ?? null,
      skipped: parsed.data.skipped ?? false,
    } as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
