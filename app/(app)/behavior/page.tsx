import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Dna, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export const metadata: Metadata = { title: "ملاحظات السلوك" };

const SEVERITY_LABELS: Record<string, string> = {
  mild: "خفيف",
  moderate: "متوسط",
  severe: "شديد",
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  mild: { bg: "bg-yellow-50", text: "text-yellow-700" },
  moderate: { bg: "bg-orange-50", text: "text-orange-700" },
  severe: { bg: "bg-red-50", text: "text-red-700" },
};

const SEVERITY_ICON_COLORS: Record<string, string> = {
  mild: "bg-yellow-50 text-yellow-600",
  moderate: "bg-orange-50 text-orange-600",
  severe: "bg-red-50 text-red-600",
};

export default async function BehaviorPage({
  searchParams,
}: {
  searchParams: Promise<{ pet_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const petId = params?.pet_id;

  const [{ data: pets }, { data: observations }] = await Promise.all([
    supabase
      .from("pets")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
    (async () => {
      let q = supabase
        .from("behavior_observations")
        .select(
          `*, pets!inner(name, user_id),
           behavior_observation_types(behavior_types(id, label_ar, label_en, is_concern))`
        )
        .eq("pets.user_id", user.id)
        .order("observed_at", { ascending: false })
        .limit(50);
      if (petId) q = q.eq("pet_id", petId);
      return q;
    })(),
  ]);

  const showPetName = (pets?.length ?? 0) > 1;

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900">ملاحظات السلوك</h1>
            <p className="text-sm text-stone-500">
              {observations?.length ?? 0} ملاحظة
            </p>
          </div>
          <Link href="/behavior/new">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-md active:scale-95 transition-transform">
              <Plus size={20} />
            </div>
          </Link>
        </div>

        {/* Pet filter chips */}
        {showPetName && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <Link href="/behavior">
              <div
                className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  !petId
                    ? "border-sage-600 bg-sage-600 text-white"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                الكل
              </div>
            </Link>
            {(pets as any[]).map((p: any) => (
              <Link key={p.id} href={`/behavior?pet_id=${p.id}`}>
                <div
                  className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    petId === p.id
                      ? "border-sage-600 bg-sage-600 text-white"
                      : "border-stone-200 bg-white text-stone-600"
                  }`}
                >
                  {p.name}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-4 space-y-3">
        {!observations?.length ? (
          <div className="flex flex-col items-center justify-center gap-4 py-28 text-stone-400">
            <Dna size={48} className="opacity-30" />
            <p className="text-sm">لا توجد ملاحظات سلوكية</p>
            <Link href="/behavior/new">
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 active:bg-stone-50">
                تسجيل أول ملاحظة
              </div>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
            {(observations as any[]).map((obs: any) => {
              const behaviors = obs.behavior_observation_types ?? [];
              const pet = obs.pets;
              const sev = obs.severity as string | undefined;
              const iconColors =
                SEVERITY_ICON_COLORS[sev ?? ""] ?? "bg-orange-50 text-orange-600";
              const sevColors = SEVERITY_COLORS[sev ?? ""];

              return (
                <div key={obs.id} className="flex items-start gap-3 p-4">
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconColors}`}
                  >
                    <Dna size={16} />
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {showPetName && pet?.name && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                          {pet.name}
                        </span>
                      )}
                      {sev && sevColors && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${sevColors.bg} ${sevColors.text}`}
                        >
                          {SEVERITY_LABELS[sev] ?? sev}
                        </span>
                      )}
                    </div>

                    {/* Behavior type tags */}
                    {behaviors.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {behaviors.map((bt: any, i: number) => {
                          const btype = bt?.behavior_types;
                          if (!btype) return null;
                          return (
                            <span
                              key={i}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                btype.is_concern
                                  ? "bg-red-50 text-red-600"
                                  : "bg-green-50 text-green-700"
                              }`}
                            >
                              {btype.label_ar ?? btype.label_en}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {obs.notes && (
                      <p className="mt-1 text-sm text-stone-500 line-clamp-2 italic">
                        &ldquo;{obs.notes}&rdquo;
                      </p>
                    )}

                    <div className="mt-1 flex items-center gap-1 text-xs text-stone-400">
                      <Clock size={11} />
                      {format(
                        new Date(obs.observed_at),
                        "d MMM yyyy - HH:mm",
                        { locale: arSA }
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
