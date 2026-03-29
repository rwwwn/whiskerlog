import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/households/[id]/activity — get activity feed with pagination
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is member of household
  const { data: membership } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this household" },
      { status: 403 }
    );
  }

  // Parse query parameters for pagination and filtering
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const actionType = searchParams.get("action_type"); // Optional filter

  // Fetch activity logs from the view (which handles RLS)
  let query = supabase
    .from("activity_feed_view" as any)
    .select(
      "id, household_id, user_id, user_name, user_avatar, action_type, resource_type, resource_id, resource_name, description, metadata, created_at, time_ago"
    )
    .eq("household_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (actionType) {
    query = query.eq("action_type", actionType);
  }

  const { data: activities, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: activities || [],
    pagination: {
      limit,
      offset,
      total: count || 0,
    },
  });
}
