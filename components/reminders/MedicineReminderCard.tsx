"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const DAYS_SHORT = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];
const DAYS_FULL = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

interface MedicineReminderCardProps {
  id: string;
  medicineName: string;
  dosage?: string;
  timeOfDay: string;
  daysOfWeek: number[];
  notes?: string;
  petName: string;
  completedToday?: boolean;
  onDelete?: (id: string) => void;
}

export function MedicineReminderCard({
  id,
  medicineName,
  dosage,
  timeOfDay,
  daysOfWeek,
  notes,
  petName,
  completedToday = false,
  onDelete,
}: MedicineReminderCardProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(completedToday);
  const [isPending, setIsPending] = useState(false);

  const todayIndex = new Date().getDay();
  const isScheduledToday = daysOfWeek.includes(todayIndex);

  async function handleComplete() {
    if (isCompleted || isPending) return;

    setIsPending(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch(`/api/medicine-reminders/${id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_date: today }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast({ variant: "destructive", title: "خطأ", description: error });
        return;
      }

      setIsCompleted(true);
      toast({ title: "تم", description: "تم تسجيل تناول الدواء" });
      router.refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل التسجيل" });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm("هل تريد حذف هذا التنبيه؟")) return;

    try {
      const res = await fetch(`/api/medicine-reminders/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل الحذف" });
        return;
      }

      toast({ title: "تم", description: "تم حذف التنبيه" });
      router.refresh();
      onDelete?.(id);
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل الحذف" });
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-4 transition-all",
        isScheduledToday
          ? isCompleted
            ? "border-sage-200 bg-sage-50"
            : "border-amber-200 bg-amber-50"
          : "border-stone-200 bg-stone-50"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-stone-900 truncate">{medicineName}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {petName} {dosage ? `• ${dosage}` : ""}
          </p>
        </div>
        {isScheduledToday && (
          <button
            onClick={handleComplete}
            disabled={isCompleted || isPending}
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-all",
              isCompleted
                ? "bg-sage-600 text-white cursor-default"
                : "bg-white border-2 border-amber-400 text-amber-600 hover:bg-amber-100"
            )}
          >
            {isCompleted ? <Check size={16} /> : <span className="text-xs">✓</span>}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-700">{timeOfDay}</span>
          <div className="flex gap-1">
            {DAYS_FULL.map((day, idx) => (
              <span
                key={idx}
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  daysOfWeek.includes(idx)
                    ? "bg-sage-200 text-sage-800"
                    : "text-stone-300"
                )}
              >
                {DAYS_SHORT[idx]}
              </span>
            ))}
          </div>
        </div>

        {notes && (
          <p className="text-xs text-stone-600 italic">{notes}</p>
        )}
      </div>

      <button
        onClick={handleDelete}
        className="mt-3 flex items-center justify-center gap-1 w-full rounded-lg bg-white border border-stone-200 px-3 py-1.5 text-xs font-medium text-coral-600 hover:bg-coral-50 transition-colors"
      >
        <X size={12} />
        حذف
      </button>
    </div>
  );
}
