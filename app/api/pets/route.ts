import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { petSchema } from "@/lib/validations/pet";

// GET /api/pets — list pets accessible to the authenticated user (own + household)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS policy on pets allows SELECT when user_id = auth.uid() OR is a household member
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/pets — create a new pet
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = petSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("pets")
    .insert({
      ...parsed.data,
      user_id: user.id,
      breed: parsed.data.breed || null,
      medical_notes: parsed.data.medical_notes || null,
      photo_url: parsed.data.photo_url || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
