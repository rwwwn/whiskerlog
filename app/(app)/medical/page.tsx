import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Stethoscope,
  Plus,
  CalendarClock,
  User,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export const metadata: Metadata = { title: "السجلات الطبية" };

export default async function MedicalPage({
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

  const [{ data: pets }, { data: records }] = await Promise.all([
    supabase
      .from("pets")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
    (async () => {
      let q = supabase
        .from("medical_records")
        .select("*, pets!inner(id, name, user_id)")
        .eq("pets.user_id", user.id)
        .order("record_date", { ascending: false });
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
            <h1 className="text-xl font-bold text-stone-900">السجلات الطبية</h1>
            <p className="text-sm text-stone-500">
              {records?.length ?? 0} سجل
            </p>
          </div>
          <Link href="/medical/new">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-md active:scale-95 transition-transform">
              <Plus size={20} />
            </div>
          </Link>
        </div>

        {/* Pet filter chips */}
        {showPetName && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <Link href="/medical">
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
              <Link key={p.id} href={`/medical?pet_id=${p.id}`}>
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
        {!records?.length ? (
          <div className="flex flex-col items-center justify-center gap-4 py-28 text-stone-400">
            <Stethoscope size={48} className="opacity-30" />
            <p className="text-sm">لا توجد سجلات طبية</p>
            <Link href="/medical/new">
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 active:bg-stone-50">
                إضافة أول سجل
              </div>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
            {(records as any[]).map((record: any) => {
              const pet = record.pets;
              const followUp = record.follow_up_date
                ? new Date(record.follow_up_date)
                : null;
              const isFollowUpSoon =
                followUp &&
                followUp > new Date() &&
                followUp.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
              const isFollowUpOverdue = followUp && followUp < new Date();

              return (
                <Link key={record.id} href={`/medical/${record.id}`}>
                  <div className="flex items-start gap-3 p-4 active:bg-stone-50">
                    {/* Icon */}
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Stethoscope size={16} />
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-stone-900 leading-snug line-clamp-1">
                          {record.diagnosis ?? "زيارة بيطرية"}
                        </p>
                        {(isFollowUpSoon || isFollowUpOverdue) && (
                          <AlertCircle
                            size={14}
                            className={`shrink-0 mt-0.5 ${
                              isFollowUpOverdue
                                ? "text-red-500"
                                : "text-amber-500"
                            }`}
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        {record.record_date && (
                          <span className="flex items-center gap-1 text-xs text-stone-400">
                            <CalendarClock size={11} />
                            {format(
                              new Date(record.record_date),
                              "d MMM yyyy",
                              { locale: arSA }
                            )}
                          </span>
                        )}
                        {showPetName && pet?.name && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                            {pet.name}
                          </span>
                        )}
                      </div>

                      {(record.vet_name || record.clinic_name) && (
                        <p className="flex items-center gap-1 mt-0.5 text-xs text-stone-400">
                          <User size={11} />
                          {[record.vet_name, record.clinic_name]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}

                      {record.treatment && (
                        <p className="mt-1 text-sm text-stone-500 line-clamp-2">
                          {record.treatment}
                        </p>
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
