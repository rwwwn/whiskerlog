import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VitaminChecklist } from "@/components/vitamins/VitaminChecklist";
import { Pill, Plus } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export const metadata = { title: "الفيتامينات اليومية" };

export default async function VitaminsPage({
  searchParams,
}: {
  searchParams: Promise<{ pet_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { pet_id } = await searchParams;

  // Fetch today's vitamins via the view or fallback to pet_vitamins
  let viewQuery = supabase.from("todays_vitamins_view").select("*");
  if (pet_id) viewQuery = viewQuery.eq("pet_id", pet_id);

  const { data: vitamins, error: viewError } = await viewQuery;

  let items: any[] | null = vitamins as any[] | null;
  if (viewError || !items) {
    const { data: petVitamins } = await supabase
      .from("pet_vitamins")
      .select(
        `id, start_date, end_date, is_active, notes,
         pets!inner(id, name, user_id), vitamins(id, name)`
      )
      .eq("pets.user_id", user.id)
      .eq("is_active", true);

    items = (petVitamins ?? []).map((pv: any) => ({
      pet_vitamin_id: pv.id,
      pet_id: pv.pets?.id,
      pet_name: pv.pets?.name,
      vitamin_name: pv.vitamins?.name,
      dosage: null,
      frequency: null,
      given_today: false,
      last_given_at: null,
    }));
  }

  const [{ data: pets }] = await Promise.all([
    supabase
      .from("pets")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  const dayLabel = format(new Date(), "EEEE d MMMM", { locale: arSA });
  const givenCount = items?.filter((i: any) => i.given_today).length ?? 0;
  const totalCount = items?.length ?? 0;
  const progress = totalCount > 0 ? Math.round((givenCount / totalCount) * 100) : 0;
  const showPetName = (pets?.length ?? 0) > 1;

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900">الفيتامينات</h1>
            <p className="text-sm text-stone-500">{dayLabel}</p>
          </div>
          <Link href="/vitamins/new">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-md active:scale-95 transition-transform">
              <Plus size={20} />
            </div>
          </Link>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-2.5">
            <Pill size={18} className="shrink-0 text-sage-600" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>{givenCount} من {totalCount} مُعطى</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-stone-100">
                <div
                  className="h-2 rounded-full bg-sage-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Pet filter chips */}
        {showPetName && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <Link href="/vitamins">
              <div
                className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  !pet_id
                    ? "border-sage-600 bg-sage-600 text-white"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                الكل
              </div>
            </Link>
            {(pets as any[]).map((p: any) => (
              <Link key={p.id} href={`/vitamins?pet_id=${p.id}`}>
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
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-4">
        {!items?.length ? (
          <div className="flex flex-col items-center justify-center gap-4 py-28 text-stone-400">
            <Pill size={48} className="opacity-30" />
            <p className="text-sm">لا توجد فيتامينات مُعيَّنة</p>
            <Link href="/vitamins/new">
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 active:bg-stone-50">
                إضافة فيتامين
              </div>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm p-4">
            <VitaminChecklist items={items as any} />
          </div>
        )}
      </div>
    </div>
  );
}
