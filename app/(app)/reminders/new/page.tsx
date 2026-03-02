import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MedicineReminderForm } from "@/components/reminders/MedicineReminderForm";

export const metadata: Metadata = { title: "إضافة تنبيه" };

export default async function NewReminderPage({
  searchParams,
}: {
  searchParams?: Promise<{ pet_id?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name");

  const petsList = (pets || []) as Array<{ id: string; name: string }>;

  if (petsList.length === 0) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white p-8 text-center max-w-sm">
          <p className="font-semibold text-stone-700 mb-2">لا توجد حيوانات</p>
          <p className="text-sm text-stone-500">أضف حيواناً أولاً قبل إضافة التنبيهات</p>
        </div>
      </div>
    );
  }

  const params = (await searchParams) ?? {};
  const defaultPetId = params.pet_id;

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm px-4 py-4 border-b border-stone-200">
        <h1 className="text-xl font-bold text-stone-900">إضافة تنبيه جديد</h1>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <MedicineReminderForm
            pets={petsList}
            defaultPetId={defaultPetId || undefined}
          />
        </div>
      </div>
    </div>
  );
}
