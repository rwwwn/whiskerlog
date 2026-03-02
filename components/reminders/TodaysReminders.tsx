import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { Pill } from "lucide-react";
import { MedicineReminderCard } from "@/components/reminders/MedicineReminderCard";

export async function TodaysReminders({ userId }: { userId: string }) {
  const supabase = await createClient();
  const supabaseAny = supabase as any;
  const today = new Date();
  const todayIndex = today.getDay();

  // Get all active reminders for this user
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
      pets(name)
    `
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  // Filter for today's reminders
  const todaysReminders = (reminders || []).filter((r: any) =>
    r.days_of_week.includes(todayIndex)
  );

  if (todaysReminders.length === 0) {
    return null;
  }

  // Check which have been completed today
  const todayStr = format(today, "yyyy-MM-dd");
  const { data: logs } = await supabaseAny
    .from("medicine_reminder_logs")
    .select("reminder_id")
    .in("reminder_id", todaysReminders.map((r: any) => r.id))
    .eq("completion_date", todayStr);

  const completedIds = new Set((logs || []).map((l: any) => l.reminder_id));

  // Sort by time
  todaysReminders.sort((a: any, b: any) => {
    const timeA = new Date(`2024-01-01 ${a.time_of_day}`);
    const timeB = new Date(`2024-01-01 ${b.time_of_day}`);
    return timeA.getTime() - timeB.getTime();
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4">
        <Pill size={14} className="text-violet-500" />
        <span className="text-xs font-semibold text-stone-700">التنبيهات اليومية</span>
      </div>
      <div className="px-4 space-y-2">
        {todaysReminders.map((reminder: any) => (
          <MedicineReminderCard
            key={reminder.id}
            id={reminder.id}
            medicineName={reminder.medicine_name}
            dosage={reminder.dosage}
            timeOfDay={reminder.time_of_day}
            daysOfWeek={reminder.days_of_week}
            notes={reminder.notes}
            petName={reminder.pets?.name || "فلان"}
            completedToday={completedIds.has(reminder.id)}
          />
        ))}
      </div>
    </div>
  );
}
