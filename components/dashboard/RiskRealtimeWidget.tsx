"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";

interface RiskSession {
  id: string;
  severity: "low" | "medium" | "high";
  symptoms: string[];
  started_at: string;
  pets: { name: string };
}

const GLOW: Record<string, string> = {
  high: "risk-glow-high",
  medium: "risk-glow-medium",
  low: "border-stone-200",
};

export function RiskRealtimeWidget({ initial }: { initial: RiskSession[] }) {
  const [sessions, setSessions] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard_risk")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "risk_monitoring_sessions" },
        async () => {
          // Re-fetch active sessions on any change
          const { data } = await supabase
            .from("risk_monitoring_sessions")
            .select("id, reason, start_date, is_active, pets(name)")
            .eq("is_active", true)
            .order("started_at", { ascending: false })
            .limit(3);

          if (data) setSessions(data as any);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!sessions.length) {
    return (
      <p className="text-xs text-stone-400 py-4 text-center">لا توجد تنبيهات نشطة</p>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <Link key={s.id} href="/risk">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-white px-3 py-2 hover:bg-stone-100 transition-colors",
              GLOW[s.severity]
            )}
          >
            <AlertTriangle
              size={16}
              className={cn(
                s.severity === "high"
                  ? "text-red-500 animate-pulse"
                  : s.severity === "medium"
                  ? "text-amber-500"
                  : "text-green-500"
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-800 truncate">
                {(s.pets as any)?.name}
              </p>
              <p className="text-xs text-stone-400 truncate">
                {s.symptoms.slice(0, 2).join("، ")}
              </p>
            </div>
            <span className="text-xs text-stone-300 shrink-0">
              {formatDistanceToNow(new Date(s.started_at), { locale: arSA, addSuffix: true })}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
