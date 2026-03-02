"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

const schema = z.object({
  pet_id: z.string().uuid(),
  medicine_name: z.string().min(1, "مطلوب"),
  dosage: z.string().optional(),
  time_of_day: z.string().min(1, "مطلوب"),
  days_of_week: z.array(z.number()).min(1, "اختر يوماً على الأقل"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MedicineReminderFormProps {
  pets: { id: string; name: string }[];
  defaultPetId?: string;
  onSuccess?: () => void;
}

export function MedicineReminderForm({
  pets,
  defaultPetId,
  onSuccess,
}: MedicineReminderFormProps) {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pet_id: defaultPetId ?? pets[0]?.id,
      medicine_name: "",
      dosage: "",
      time_of_day: "09:00",
      days_of_week: [],
      notes: "",
    },
  });

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      setValue("days_of_week", next);
      return next;
    });
  };

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/medicine-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          days_of_week: selectedDays,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast({ variant: "destructive", title: "خطأ", description: error });
        return;
      }

      toast({ title: "تم", description: "تم إضافة التنبيه بنجاح" });
      setSelectedDays([]);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل الإضافة" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-stone-700 mb-1 block">الحيوان</label>
        <select
          {...register("pet_id")}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
        >
          {pets.map((pet) => (
            <option key={pet.id} value={pet.id}>
              {pet.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 mb-1 block">اسم الدواء</label>
        <Input {...register("medicine_name")} placeholder="مثال: أميكسيسيلين" />
        {errors.medicine_name && (
          <p className="text-xs text-coral-600 mt-1">{errors.medicine_name.message}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 mb-1 block">الجرعة (اختياري)</label>
        <Input {...register("dosage")} placeholder="مثال: 250mg" />
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 mb-1 block">الوقت</label>
        <Input {...register("time_of_day")} type="time" />
        {errors.time_of_day && (
          <p className="text-xs text-coral-600 mt-1">{errors.time_of_day.message}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 mb-2 block">أيام الأسبوع</label>
        <div className="grid grid-cols-4 gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={cn(
                "rounded-lg px-2 py-2 text-[11px] font-semibold border transition-colors",
                selectedDays.includes(day.value)
                  ? "border-sage-500 bg-sage-50 text-sage-700"
                  : "border-stone-200 bg-white text-stone-600 hover:border-sage-300"
              )}
            >
              {day.label.slice(0, 3)}
            </button>
          ))}
        </div>
        {errors.days_of_week && (
          <p className="text-xs text-coral-600 mt-1">{errors.days_of_week.message}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 mb-1 block">ملاحظات (اختياري)</label>
        <textarea
          {...register("notes")}
          rows={3}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs"
          placeholder="معلومات إضافية..."
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-sage-600 hover:bg-sage-700"
      >
        {isSubmitting ? "جاري الإضافة..." : "إضافة التنبيه"}
      </Button>
    </form>
  );
}
