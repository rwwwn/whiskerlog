import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { AlertWithPet } from "@/types";
import { AlertCard } from "@/components/alerts/AlertCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "التنبيهات" };

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: activeAlerts }, { data: resolvedAlerts }] = await Promise.all([
    supabase
      .from("alerts")
      .select("*, pets(id, name)")
      .eq("user_id", user.id)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false }),

    supabase
      .from("alerts")
      .select("*, pets(id, name)")
      .eq("user_id", user.id)
      .eq("is_resolved", true)
      .order("resolved_at", { ascending: false })
      .limit(50),
  ]);

  const activeCount = activeAlerts?.length ?? 0;

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm px-4 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-stone-900">التنبيهات</h1>
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-stone-400">نتائج الكشف التلقائي عن الأنماط الصحية</p>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="active">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1 gap-2">
              <Bell size={13} />
              نشطة
              {activeCount > 0 && (
                <span className="mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex-1 gap-2">
              <CheckCheck size={13} />
              مُعالَجة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeCount === 0 ? (
              <EmptyState
                icon={Bell}
                title="لا توجد تنبيهات نشطة"
                description="جميع الأنماط المرصودة ضمن النطاق الطبيعي."
              />
            ) : (
              (activeAlerts as any[]).map((alert: any) => (
                <AlertCard key={alert.id} alert={alert as AlertWithPet} />
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="mt-4 space-y-3">
            {(resolvedAlerts?.length ?? 0) === 0 ? (
              <EmptyState
                icon={CheckCheck}
                title="لا توجد تنبيهات مُعالَجة"
                description="ستظهر التنبيهات المُعالَجة هنا."
              />
            ) : (
              (resolvedAlerts as any[]).map((alert: any) => (
                <AlertCard key={alert.id} alert={alert as AlertWithPet} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
