import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import {
  PawPrint, PlusCircle, CheckCircle2, AlertTriangle,
  UtensilsCrossed, Pill, Apple, Activity, Bell, Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MultiMealButton } from "@/components/meals/MultiMealButton";
import { MealSlots } from "@/components/meals/MealSlots";

export const metadata: Metadata = { title: "البيت" };
export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, (e: any) => string> = {
  fed_food:          (e) => `أطعم${e.food_name ? ` ${e.food_name}` : ""}${e.food_amount_g ? ` (${e.food_amount_g}جم)` : ""}`,
  gave_medication:   ()  => `أعطى دواء`,
  gave_vitamins:     ()  => `أعطى فيتامين`,
  grooming:          ()  => `عناية بـ`,
  litter_cleaned:    ()  => `نظّف الصندوق`,
  behavior_observed: ()  => `لاحظ سلوكاً`,
  vet_visit:         ()  => `زار الطبيب`,
  weight_recorded:   (e) => `سجّل وزن${e.weight_kg ? ` ${e.weight_kg} كجم` : ""}`,
  other:             ()  => `سجّل`,
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today      = new Date();
  const todayDate  = format(today, "yyyy-MM-dd");
  const arabicDate = format(today, "EEEE، d MMMM", { locale: arSA });
  const hour       = today.getHours();
  const greeting   =
    hour < 5  ? "ليلة طيبة"  :
    hour < 12 ? "صباح الخير" :
    hour < 17 ? "طاب نهارك"  : "مساء الخير";

  const { data: petsRaw } = await supabase
    .from("pets").select("id, name, photo_url")
    .eq("user_id", user.id).eq("is_active", true).order("name");

  const pets   = (petsRaw ?? []) as Array<{ id: string; name: string; photo_url: string | null }>;
  const petIds = pets.map((p) => p.id);
  const ids    = petIds.length > 0 ? petIds : ["00000000-0000-0000-0000-000000000000"];

  const [
    { data: profile },
    { data: activeMealPlans },
    { data: todayMealCompletions },
    { data: activeTreatments },
    { data: treatmentLogsToday },
    { data: activeVitamins },
    { data: vitaminLogsToday },
    { data: riskSessions },
    { data: activeAlerts },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("meal_plans").select("id, pet_id, meals_per_day, meal_times").in("pet_id", ids).eq("is_active", true),
    supabase.from("meal_completions").select("meal_plan_id, pet_id, completion_date, completed_slots").in("pet_id", ids).eq("completion_date", todayDate),
    supabase.from("treatment_plans").select("id, pet_id, title").in("pet_id", ids).eq("is_active", true),
    supabase.from("treatment_logs").select("treatment_plan_id, pet_id, log_date").in("pet_id", ids).eq("log_date", todayDate),
    supabase.from("pet_vitamins").select("id, pet_id, vitamins(name)").in("pet_id", ids).eq("is_active", true),
    supabase.from("vitamin_logs").select("pet_vitamin_id, pet_id, log_date").in("pet_id", ids).eq("log_date", todayDate),
    supabase.from("risk_monitoring_sessions").select("id, pet_id, reason").in("pet_id", ids).eq("is_active", true),
    supabase.from("alerts").select("id, message, severity, pet_id, pets(name)").eq("user_id", user.id).eq("is_resolved", false).order("created_at", { ascending: false }).limit(5),
    supabase.from("log_entries").select("id, event_type, occurred_at, notes, food_name, food_amount_g, weight_kg, pet_id, pets!inner(name, user_id), profiles(display_name)").eq("pets.user_id", user.id).order("occurred_at", { ascending: false }).limit(12),
  ]);

  const userName = (profile as any)?.display_name?.split(" ")[0] ?? "";

  const petDays = pets.map((pet) => {
    const plans          = (activeMealPlans ?? []).filter((p: any) => p.pet_id === pet.id);
    const totalSlots     = plans.reduce((s: number, p: any) => s + (p.meal_times?.length || p.meals_per_day || 0), 0);
    const completions    = (todayMealCompletions ?? []).filter((c: any) => c.pet_id === pet.id);
    const completedSlots = completions.reduce((s: number, c: any) => s + ((c.completed_slots as any[])?.length ?? 0), 0);

    const treatments  = (activeTreatments ?? []).filter((t: any) => t.pet_id === pet.id);
    const txLogsToday = (treatmentLogsToday ?? []).filter((l: any) => l.pet_id === pet.id);
    const meds = treatments.map((t: any) => ({
      id: t.id, title: t.title,
      dosedToday: txLogsToday.some((l: any) => l.treatment_plan_id === t.id),
    }));

    const vitamins = (activeVitamins ?? []).filter((v: any) => v.pet_id === pet.id);
    const givenIds = (vitaminLogsToday ?? []).filter((l: any) => l.pet_id === pet.id).map((l: any) => l.pet_vitamin_id);
    const vits = vitamins.map((v: any) => ({
      id: v.id, name: (v.vitamins as any)?.name ?? "—",
      givenToday: givenIds.includes(v.id),
    }));

    const risk    = (riskSessions ?? []).find((r: any) => r.pet_id === pet.id) as { id: string; pet_id: string; reason: string } | null ?? null;
    const allDone = (totalSlots === 0 || completedSlots >= totalSlots)
                 && (meds.length  === 0 || meds.every(m => m.dosedToday))
                 && (vits.length  === 0 || vits.every(v => v.givenToday))
                 && !risk;

    return {
      pet,
      meals: { total: totalSlots, completed: completedSlots },
      plans: plans,
      completions: completions,
      meds,
      vitamins: vits,
      risk,
      allDone
    };
  });

  const allPetsDone = petDays.length > 0 && petDays.every(pd => pd.allDone);
  const totalAlerts = (activeAlerts ?? []).length;

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm px-4">
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-xs text-stone-400 font-medium">{arabicDate}</p>
            <h1 className="text-xl font-bold text-stone-900">
              {greeting}{userName ? `، ${userName}` : ""}
            </h1>
          </div>
          {totalAlerts > 0 && (
            <Link href="/alerts">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                <Bell size={18} />
                <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white">
                  {totalAlerts}
                </span>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* Empty state */}
        {pets.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-stone-200 bg-white py-16 text-center mt-4">
            <PawPrint size={40} className="text-stone-300" />
            <div>
              <p className="font-semibold text-stone-700">لا توجد حيوانات بعد</p>
              <p className="text-sm text-stone-400 mt-1">أضف قطتك الأولى لتبدأ</p>
            </div>
            <Link href="/pets/new" className="inline-flex items-center gap-2 rounded-2xl bg-sage-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sage-700 transition-colors">
              <PlusCircle size={16} />
              إضافة قطة
            </Link>
          </div>
        )}

        {/* All-done */}
        {allPetsDone && pets.length > 0 && (
          <div className="flex items-center gap-3 rounded-3xl bg-sage-50 border border-sage-200 px-4 py-3.5">
            <Sparkles size={20} className="text-sage-600 shrink-0" />
            <div>
              <p className="font-bold text-sage-800 text-sm">كل شيء مكتمل اليوم 🐾</p>
              <p className="text-xs text-sage-600 mt-0.5">حيواناتك بخير تماماً</p>
            </div>
          </div>
        )}

        {/* Multi-meal button */}
        {pets.length > 0 && (
          <MultiMealButton pets={pets} />
        )}

        {/* Alert strip */}
        {totalAlerts > 0 && (
          <div className="space-y-2">
            {(activeAlerts as any[]).slice(0, 2).map((alert: any) => (
              <Link key={alert.id} href="/alerts">
                <div className="flex items-start gap-3 rounded-2xl bg-coral-50 border border-coral-200 px-4 py-3">
                  <AlertTriangle size={16} className="text-coral-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-coral-900 line-clamp-1">{alert.message}</p>
                    <p className="text-xs text-coral-500 mt-0.5">{(alert.pets as any)?.name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Per-pet cards */}
        {petDays.map(({ pet, meals, plans, completions, meds, vitamins, risk, allDone }) => (
          <div key={pet.id} className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">

            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-stone-100">
                {pet.photo_url ? (
                  <Image src={pet.photo_url} alt={pet.name} width={44} height={44} className="object-cover h-full w-full" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <PawPrint size={18} className="text-stone-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-stone-900">{pet.name}</h3>
                {risk && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                    <Activity size={10} />
                    مراقبة صحية نشطة
                  </span>
                )}
              </div>
              {allDone && <CheckCircle2 size={18} className="text-sage-500 shrink-0" />}
              <Link href={`/pets/${pet.id}`} className="text-[11px] text-sage-600 font-semibold shrink-0">عرض</Link>
            </div>

            <div className="px-4 py-3.5 space-y-4">

              {meals.total > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed size={14} className="text-amber-500" />
                      <span className="text-xs font-semibold text-stone-700">الوجبات</span>
                    </div>
                    <span className="text-xs text-stone-400">{meals.completed}/{meals.total}</span>
                  </div>
                  <Progress value={meals.total > 0 ? (meals.completed / meals.total) * 100 : 0} className="h-2 bg-stone-100 [&>*]:bg-amber-400" />
                  {meals.completed >= meals.total && (
                    <p className="text-[11px] text-sage-600 font-semibold">جميع الوجبات مكتملة</p>
                  )}
                  {plans.length > 0 && (
                    plans.map((plan: any) => (
                      <MealSlots
                        key={plan.id}
                        planId={plan.id}
                        petName={pet.name}
                        mealTimes={plan.meal_times ?? []}
                        completedSlots={(completions.find((c: any) => c.meal_plan_id === plan.id)?.completed_slots ?? []) as any}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={14} className="text-stone-300" />
                    <span className="text-xs text-stone-400">لا توجد خطة وجبات</span>
                  </div>
                  <Link href={`/meals/new?pet_id=${pet.id}`} className="text-[11px] text-sage-600 font-semibold">إضافة</Link>
                </div>
              )}

              {meds.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Pill size={14} className="text-violet-500" />
                    <span className="text-xs font-semibold text-stone-700">الأدوية</span>
                  </div>
                  <div className="space-y-1.5">
                    {meds.map(med => (
                      <div key={med.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                        <span className="text-xs text-stone-700 truncate font-medium">{med.title}</span>
                        {med.dosedToday ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sage-600 shrink-0 ms-2">
                            <CheckCircle2 size={11} />مكتمل
                          </span>
                        ) : (
                          <Link href={`/treatments/${med.id}`} className="text-[10px] font-semibold text-coral-600 shrink-0 ms-2">سجّل الآن</Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {vitamins.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Apple size={14} className="text-green-500" />
                    <span className="text-xs font-semibold text-stone-700">الفيتامينات</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vitamins.map(vit => (
                      <span key={vit.id} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                        vit.givenToday ? "bg-sage-50 text-sage-700 border-sage-200" : "bg-stone-50 text-stone-500 border-stone-200"
                      }`}>
                        {vit.givenToday && <CheckCircle2 size={10} />}
                        {vit.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {risk && (
                <Link href="/risk">
                  <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 border bg-amber-50 border-amber-200">
                    <Activity size={14} className="text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-800">مراقبة صحية نشطة</p>
                      {risk.reason && <p className="text-[10px] text-stone-500 truncate mt-0.5">{risk.reason}</p>}
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0">عرض ←</span>
                  </div>
                </Link>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1">
                <Link href={`/logs/new?pet_id=${pet.id}&event_type=fed_food`} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 py-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                  <UtensilsCrossed size={12} />طعام
                </Link>
                <Link href={`/logs/new?pet_id=${pet.id}&event_type=gave_medication`} className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-50 border border-violet-100 py-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
                  <Pill size={12} />دواء
                </Link>
                <Link href={`/logs/new?pet_id=${pet.id}&event_type=weight_recorded`} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 border border-blue-100 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                  <span className="text-xs leading-none">⚖️</span>وزن
                </Link>
              </div>
            </div>
          </div>
        ))}

        {(recentActivity ?? []).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-900">آخر النشاطات</h2>
              <Link href="/logs" className="text-xs text-sage-600 font-semibold">عرض الكل</Link>
            </div>
            <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden divide-y divide-stone-100">
              {(recentActivity as any[]).slice(0, 8).map((entry: any) => {
                const contributor = (entry.profiles as any)?.display_name;
                const petName     = (entry.pets as any)?.name;
                const labelFn     = EVENT_LABELS[entry.event_type] ?? (() => "سجّل");
                const detail      = labelFn(entry);
                const timeStr     = format(new Date(entry.occurred_at), "HH:mm");
                const dayStr      = format(new Date(entry.occurred_at), "d MMM", { locale: arSA });
                return (
                  <Link key={entry.id} href={`/logs/${entry.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-[11px] font-bold">
                        {contributor ? contributor.charAt(0) : "أ"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-800 truncate">
                          <span className="font-semibold">{contributor ?? "أنت"}</span>
                          {" "}{detail}{" لـ "}
                          <span className="font-semibold">{petName}</span>
                        </p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-[11px] text-stone-500">{timeStr}</p>
                        <p className="text-[10px] text-stone-300">{dayStr}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}
