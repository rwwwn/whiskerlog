import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { MealChecklist } from "@/components/meals/MealChecklist";
import { Button } from "@/components/ui/button";
import { PlusCircle, UtensilsCrossed } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { arSA } from "date-fns/locale";

export const metadata = { title: "خطط الوجبات" };

export default async function MealsPage({
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
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Get today's completions range
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();

  let query = supabase
    .from("meal_plans")
    .select(
      `
      *,
      pets!inner(id, name, user_id),
      meal_completions(id, completion_date, completed_slots, completed_by)
    `
    )
    .eq("pets.user_id", user.id)
    .eq("is_active", true);
  // Filter completions client-side since we can't do gte/lte on nested tables cleanly

  if (pet_id) query = query.eq("pet_id", pet_id);

  const { data: plans } = await query;

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const dayLabel = format(today, "EEEE d MMMM", { locale: arSA });

  return (
    <div className="space-y-6 px-4 py-6">
      <PageHeader title={`وجبات اليوم — ${dayLabel}`}>
        <Link href="/meals/new">
          <Button size="sm" className="gap-2 bg-sage-600 hover:bg-sage-700 text-white">
            <PlusCircle size={16} />
            خطة جديدة
          </Button>
        </Link>
      </PageHeader>

      {/* Pet filter */}
      {pets && pets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/meals">
            <span
              className={`rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors ${
                !pet_id
                  ? "border-teal-500 bg-sage-600/20 text-sage-500"
                  : "border-stone-300 text-stone-500 hover:border-stone-300"
              }`}
            >
              الكل
            </span>
          </Link>
          {(pets as any[]).map((p: any) => (
            <Link key={p.id} href={`/meals?pet_id=${p.id}`}>
              <span
                className={`rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors ${
                  pet_id === p.id
                    ? "border-teal-500 bg-sage-600/20 text-sage-500"
                    : "border-stone-300 text-stone-500 hover:border-stone-300"
                }`}
              >
                {p.name}
              </span>
            </Link>
          ))}
        </div>
      )}

      {!(plans as any[])?.length ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-stone-400">
          <UtensilsCrossed size={48} className="opacity-30" />
          <p>لا توجد خطط وجبات لهذا اليوم</p>
          <Link href="/meals/new">
            <Button variant="outline">إضافة خطة وجبات</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(plans as any[]).map((plan: any) => (
            <div
              key={plan.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <MealChecklist plan={plan as any} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
