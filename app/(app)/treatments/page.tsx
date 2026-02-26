import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FlaskConical, Plus } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

const FREQ_LABELS: Record<string, string> = {
  once: "مرة واحدة",
  daily: "يومياً",
  twice_daily: "مرتين يومياً",
  three_times_daily: "ثلاث مرات يومياً",
  weekly: "أسبوعياً",
  biweekly: "كل أسبوعين",
  monthly: "شهرياً",
  as_needed: "عند الحاجة",
};

export const metadata = { title: "خطط العلاج" };

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ pet_id?: string; all?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { pet_id, all } = await searchParams;

  let query = supabase
    .from("treatment_plans")
    .select(`*, pets!inner(id, name, user_id), treatment_logs(id)`)
    .eq("pets.user_id", user.id)
    .order("created_at", { ascending: false });

  if (!all) query = (query as any).eq("is_active", true);
  if (pet_id) query = (query as any).eq("pet_id", pet_id);

  const [{ data: plans }, { data: pets }] = await Promise.all([
    query as any,
    supabase.from("pets").select("id, name").eq("user_id", user.id).order("name"),
  ]);

  const showPetName = (pets?.length ?? 0) > 1;

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900">خطط العلاج</h1>
            <p className="text-sm text-stone-500">
              {plans?.length ?? 0} خطة
            </p>
          </div>
          <Link href="/treatments/new">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-md active:scale-95 transition-transform">
              <Plus size={20} />
            </div>
          </Link>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <Link href="/treatments">
            <div
              className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                !all && !pet_id
                  ? "border-sage-600 bg-sage-600 text-white"
                  : "border-stone-200 bg-white text-stone-600"
              }`}
            >
              النشطة
            </div>
          </Link>
          <Link href="/treatments?all=1">
            <div
              className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                all
                  ? "border-sage-600 bg-sage-600 text-white"
                  : "border-stone-200 bg-white text-stone-600"
              }`}
            >
              الكل
            </div>
          </Link>
          {showPetName &&
            (pets as any[])?.map((p: any) => (
              <Link
                key={p.id}
                href={`/treatments?pet_id=${p.id}${all ? "&all=1" : ""}`}
              >
                <div
                  className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    pet_id === p.id
                      ? "border-sage-600 bg-sage-600 text-white"
                      : "border-stone-200 bg-white text-stone-600"
                  }`}
                >
                  {p.name}
                </div>
              </Link>
            ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 space-y-3">
        {!plans?.length ? (
          <div className="flex flex-col items-center justify-center gap-4 py-28 text-stone-400">
            <FlaskConical size={48} className="opacity-30" />
            <p className="text-sm">لا توجد خطط علاج</p>
            <Link href="/treatments/new">
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 active:bg-stone-50">
                إضافة خطة علاج
              </div>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
            {(plans as any[]).map((plan: any) => {
              const doseCount =
                (plan.treatment_logs as { id: string }[])?.length ?? 0;
              const progress =
                plan.total_doses && plan.total_doses > 0
                  ? Math.min(
                      100,
                      Math.round((doseCount / plan.total_doses) * 100)
                    )
                  : null;

              return (
                <Link key={plan.id} href={`/treatments/${plan.id}`}>
                  <div className="flex items-start gap-3 p-4 active:bg-stone-50">
                    {/* Icon */}
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        plan.is_active
                          ? "bg-sage-50 text-sage-700"
                          : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      <FlaskConical size={16} />
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-stone-900 leading-snug line-clamp-1">
                          {plan.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            plan.is_active
                              ? "bg-sage-50 text-sage-700"
                              : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {plan.is_active ? "نشط" : "منتهٍ"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-stone-400">
                        {showPetName && plan.pets?.name && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-500">
                            {plan.pets.name}
                          </span>
                        )}
                        <span>
                          {FREQ_LABELS[plan.frequency] ?? plan.frequency}
                        </span>
                        {plan.start_date && (
                          <span>
                            {format(new Date(plan.start_date), "d MMM yyyy", {
                              locale: arSA,
                            })}
                          </span>
                        )}
                      </div>

                      {plan.dosage && (
                        <p className="mt-0.5 text-xs text-stone-400">
                          الجرعة: {plan.dosage}
                        </p>
                      )}

                      {progress !== null && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-stone-400 mb-1">
                            <span>
                              {doseCount} / {plan.total_doses} جرعة
                            </span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-stone-100">
                            <div
                              className="h-1.5 rounded-full bg-sage-600 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
