import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/alerts — list alerts for the authenticated user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const petId = searchParams.get("pet_id");
  const resolved = searchParams.get("resolved");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("alerts")
    .select("*, pets(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (petId) query = query.eq("pet_id", petId);
  if (resolved !== null) query = query.eq("is_resolved", resolved === "true");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
