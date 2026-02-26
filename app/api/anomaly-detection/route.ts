import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectAnomalies, deduplicateAlerts } from "@/lib/anomaly-detection";
import type { Log, Json } from "@/types";

// POST /api/anomaly-detection
// Body: { pet_id: string }
// Called after each log save to check for health anomalies and insert new alerts.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { pet_id } = body as { pet_id?: string };

  if (!pet_id) {
    return NextResponse.json({ error: "pet_id is required" }, { status: 400 });
  }

  // Verify the pet belongs to the current user
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", pet_id)
    .eq("user_id", user.id)
    .single();

  if (petError || !pet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }

  // Fetch the last 7 log entries (most recent first) for anomaly detection
  const { data: recentLogs, error: logsError } = await supabase
    .from("log_entries")
    .select("*")
    .eq("pet_id", pet_id)
    .order("occurred_at", { ascending: false })
    .limit(7);

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  if (!recentLogs || recentLogs.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const logs = recentLogs as unknown as Log[];

  // Run anomaly detection
  const generated = detectAnomalies(logs, logs);

  if (generated.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  // Fetch existing unresolved alerts for this pet to avoid duplicates
  const { data: existingAlerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("pet_id", pet_id)
    .eq("is_resolved", false);

  const toInsert = deduplicateAlerts(generated, existingAlerts ?? []);

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  // Build insert rows
  const rows = toInsert.map((a) => ({
    user_id: user.id,
    pet_id,
    alert_type: a.type,
    severity: a.severity,
    title: a.title,
    message: a.message,
    metadata: (a.metadata ?? null) as Json | null,
    is_resolved: false,
  }));

  const { error: insertError } = await supabase.from("alerts").insert(rows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: toInsert.length });
}
