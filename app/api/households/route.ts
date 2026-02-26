import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/households — list all households the user belongs to
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("household_members")
    .select(
      `
      role,
      joined_at,
      is_active,
      households (
        id, name, description, avatar_url, created_at, owner_id
      )
    `
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/households — create a new household
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
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Household name is required" },
      { status: 400 }
    );
  }

  // Use the SECURITY DEFINER RPC so RLS doesn't block the INSERT.
  // The function validates auth.uid() internally and inserts both
  // the household row and the owner member in one transaction.
  const { data: household, error: rpcError } = await supabase
    .rpc("create_household", {
      p_name: name.trim(),
      p_description: description?.trim() ?? null,
    });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ data: household }, { status: 201 });
}
