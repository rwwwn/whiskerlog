import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { RiskSessionList } from "@/components/risk/RiskSessionList";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export const metadata = { title: "مراقبة الحالة الصحية" };
export const dynamic = "force-dynamic";

export default async function RiskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch active sessions — ordered high → medium → low
  const { data: activeSessions } = await supabase
    .from("risk_monitoring_sessions")
    .select(
      `
      *,
      pets!inner(id, name, user_id)
    `
    )
    .eq("pets.user_id", user.id)
    .eq("is_active", true)
    .order("start_date", { ascending: false });

  // Fetch recent resolved sessions (last 5)
  const { data: resolvedSessions } = await supabase
    .from("risk_monitoring_sessions")
    .select(
      `
      id, reason, start_date, end_date, duration_days,
      pets!inner(id, name, user_id)
    `
    )
    .eq("pets.user_id", user.id)
    .eq("is_active", false)
    .order("start_date", { ascending: false })
    .limit(5);

  const normalized = (activeSessions ?? []).map((s: any) => ({
    ...s,
    pets: { name: s.pets?.name ?? "" },
  }));

  return (
    <div className="space-y-8 px-4 py-6">
      <PageHeader title="مراقبة الحالة الصحية">
        <Link href="/risk/new">
          <Button size="sm" className="gap-2 bg-red-600 hover:bg-red-700 text-white">
            <PlusCircle size={16} />
            بدء مراقبة
          </Button>
        </Link>
      </PageHeader>

      {/* Active sessions */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-stone-500 uppercase tracking-wider">
          جلسات نشطة ({normalized.length})
        </h2>
        <RiskSessionList initialSessions={normalized} />
      </section>

      {/* Resolved history */}
      {resolvedSessions && resolvedSessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-500 uppercase tracking-wider">
            سجل الجلسات المُغلقة
          </h2>
          <div className="space-y-2">
            {resolvedSessions.map((s: any) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm text-stone-700">{s.pets?.name}</p>
                  <p className="text-xs text-stone-400">
                    {s.symptoms?.slice(0, 3).join("، ")}
                  </p>
                </div>
                <div className="text-end">
                  <p
                    className={`text-xs font-medium ${
                      s.severity === "high"
                        ? "text-red-400"
                        : s.severity === "medium"
                        ? "text-amber-400"
                        : "text-green-400"
                    }`}
                  >
                    {s.severity === "high" ? "عالٍ" : s.severity === "medium" ? "متوسط" : "منخفض"}
                  </p>
                  {s.resolved_at && (
                    <p className="text-xs text-stone-300">
                      {format(new Date(s.resolved_at), "d MMM yyyy", { locale: arSA })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
