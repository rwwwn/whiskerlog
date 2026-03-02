import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus, Pill } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/EmptyState";
import { MedicineReminderCard } from "@/components/reminders/MedicineReminderCard";

export const metadata: Metadata = { title: "التنبيهات" };

export default async function RemindersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAny = supabase as any;

  const { data: reminders } = await supabaseAny
    .from("medicine_reminders")
    .select(
      `
      id,
      medicine_name,
      dosage,
      time_of_day,
      days_of_week,
      notes,
      pets(name),
      is_active
    `
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("time_of_day", { ascending: true });

  const hasReminders = (reminders || []).length > 0;

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm px-4 py-4 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-900">التنبيهات</h1>
          <Link
            href="/reminders/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-sage-600 text-white px-4 py-2 text-sm font-semibold hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            إضافة تنبيه
          </Link>
        </div>
      </div>

      <div className="px-4 py-4">
        {!hasReminders ? (
          <EmptyState
            icon={Pill}
            title="لا توجد تنبيهات"
            description="أضف تنبيهاً للأدوية التي يجب إعطاؤها للحيوانات"
            action={
              <Link
                href="/reminders/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-sage-600 text-white px-4 py-2 text-sm font-semibold hover:bg-sage-700 transition-colors"
              >
                <Plus size={16} />
                إضافة أول تنبيه
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {(reminders || []).map((reminder: any) => (
              <MedicineReminderCard
                key={reminder.id}
                id={reminder.id}
                medicineName={reminder.medicine_name}
                dosage={reminder.dosage}
                timeOfDay={reminder.time_of_day}
                daysOfWeek={reminder.days_of_week}
                notes={reminder.notes}
                petName={reminder.pets?.name || "فلان"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
